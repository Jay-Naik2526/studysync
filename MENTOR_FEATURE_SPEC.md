# StudySync — Mentor Module Build Spec

Implementation spec for adding a **mentor (faculty) role** to StudySync.
Written for an AI coding agent with no prior context on this repo. Read it fully before writing code.

---

## 1. What this project is

StudySync is a deployed academic dashboard used by real students at NMIMS Shirpur.

| | |
|---|---|
| Frontend | React 18 + Vite + Tailwind, deployed on **Vercel** |
| Backend | Node/Express (ESM, `"type": "module"`) in `backend/`, Docker, deployed on **Hugging Face Spaces** |
| Database | MongoDB Atlas via Mongoose |
| Auth | JWT in `localStorage`, `Authorization: Bearer <token>` |
| Automation | Playwright scrapes the college SAP portal for attendance |
| AI | Google Gemini (notes, quizzes, planner, chatbot) |

### Repo layout

```
backend/
  server.js              route mounts
  middleware/auth.js     authMiddleware — sets req.user {id,name,email,role}
  models/                User, Subject, Grade, Note, Todo, SapCredentials
  routes/                auth, subjects, grades, todos, dashboard, notes, sap
  services/              sapScraper.js, syncRunner.js, aiService.js
src/
  App.jsx                state-based view switching (NO react-router)
  api/index.js           axios client + per-domain API objects
  components/            one file per page
```

### Existing behaviour you must not break

- Students sign up, add subjects, connect SAP, and attendance syncs automatically (manual + nightly cron).
- The Class Count page projects a backlog of lectures/labs that were scheduled but never conducted.
- Everything today is **single-user**: a user only ever sees their own data.

---

## 2. Goal

Add a **mentor role**. Faculty mentors are assigned students and get a dashboard showing those students'
attendance, marks and academic risk, plus an inbox for formal applications (sick leave, missed mid-term
tests) that students submit in-app. The college currently has no mentor-management system at all.

Build **Phase 0, 1 and 2**. Phase 3 is a backlog at the end — do not start it.

---

## 3. NON-NEGOTIABLE RULES

Read this section twice. Violating it means leaking one student's academic records to another.

### 3.1 Never loosen existing ownership filters

There are **25 queries** across `routes/` shaped like:

```js
Subject.find({ user: req.user.id })
Grade.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, ...)
SapCredentials.findOne({ userId: req.user.id })
```

That set of filters is the entire security boundary of this app.

**DO NOT** edit them to also match "or I am this student's mentor". That would create 25 separate
opportunities for an IDOR bug.

**DO** build a separate `/api/mentor/*` router that re-derives authorization itself.

### 3.2 One authorization choke point

Every single mentor endpoint that touches a student's data must call this helper first:

```js
// backend/services/mentorAuth.js
export async function assertIsMyMentee(mentorId, studentId) {
  const student = await User.findOne({ _id: studentId, mentor: mentorId, role: 'student' })
                            .select('_id name email rollNo division program semester');
  if (!student) {
    const err = new Error('Not your mentee.');
    err.status = 403;
    throw err;
  }
  return student;
}
```

No mentor route may query a student's data without this returning successfully first.
Never trust a `studentId` from the request body or query string without passing it through here.

### 3.3 Data visibility boundary

| Mentors CAN see | Mentors must NEVER see |
|---|---|
| Subjects, conducted/absent counts, attendance % | SAP credentials (encrypted or otherwise) |
| At-risk flags, class backlog | Personal notes / AI-generated study material |
| Grades and marks | Todos |
| Their own mentees' applications | Any student not assigned to them |
| Last SAP sync time | Any student's password hash |

There must be **no endpoint anywhere** that returns `SapCredentials.encryptedUsername` or
`encryptedPassword` to any caller, including a mentor or admin.

### 3.4 Medical certificates are sensitive health data

Attachments must be stored as **authenticated** Cloudinary assets and served only through a backend
endpoint that authorizes the caller first. Never store or return a permanently public URL.

---

## 4. Data model changes

### 4.1 `models/User.js` — extend

```js
role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student', index: true },

// Student profile
rollNo:   { type: String, trim: true, default: '' },
division: { type: String, trim: true, default: '' },
program:  { type: String, trim: true, default: '' },
semester: { type: String, trim: true, default: '' },

// Student -> mentor link
mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

// Mentor profile
department: { type: String, trim: true, default: '' },
employeeId: { type: String, trim: true, default: '' },
mentorCode: { type: String, unique: true, sparse: true },  // e.g. "MNT-7K2F9"
```

Keep the existing `pre('save')` bcrypt hook untouched.

### 4.2 `models/Application.js` — new

```js
{
  student: { type: ObjectId, ref: 'User', required: true, index: true },
  mentor:  { type: ObjectId, ref: 'User', required: true, index: true }, // denormalised at submit time
  type: {
    type: String,
    enum: ['sick_leave', 'test_absence', 'general_leave', 'retest_request', 'other'],
    required: true,
  },
  subject: { type: ObjectId, ref: 'Subject', default: null }, // optional
  title:   { type: String, required: true, trim: true, maxlength: 150 },
  reason:  { type: String, required: true, trim: true, maxlength: 2000 },
  fromDate: { type: Date, required: true },
  toDate:   { type: Date, required: true },

  attachment: {
    publicId:     { type: String, default: null },  // Cloudinary public_id
    format:       { type: String, default: null },
    bytes:        { type: Number, default: 0 },
    originalName: { type: String, default: '' },
  },

  status: { type: String, enum: ['pending','approved','rejected','withdrawn'], default: 'pending', index: true },
  mentorRemarks: { type: String, default: '', maxlength: 1000 },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: ObjectId, ref: 'User', default: null },
}
```

With `{ timestamps: true }`. Add a compound index on `{ mentor: 1, status: 1, createdAt: -1 }`.

**Validation:** reject if `toDate < fromDate`. Reject if the student has no `mentor` set.

---

## 5. Backend implementation

### 5.1 `middleware/requireRole.js` — new

```js
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorised for this action.' });
  }
  next();
};
```

`authMiddleware` already puts `role` on `req.user` — it currently reads as `undefined` only because the
field does not exist yet. Adding it to the schema activates this with no middleware change.

### 5.2 Mentor code generation

Unambiguous alphabet (no `O`/`0`/`I`/`1`): `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
Format `MNT-XXXXX`. Generate on mentor registration, retry on duplicate-key collision.

### 5.3 Mentor registration gate

Students must not be able to self-promote to mentor. `POST /api/auth/register` accepts an optional
`role`; if `role === 'mentor'` it requires a matching `mentorSignupCode` in the body, compared against
`process.env.MENTOR_SIGNUP_CODE`. Any other role value than `student`/`mentor` is rejected.
`admin` can never be created via the API.

Also: `POST /api/auth/login` must include `role` (and `mentorCode` for mentors) in its response user
object — the frontend routes on it.

### 5.4 Endpoints

All under `authMiddleware`. Mentor routes additionally use `requireRole('mentor')`.

#### Student-facing — `routes/profile.js` (new, mount at `/api/profile`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Current user's profile, including populated mentor `{name, email, department}` |
| PATCH | `/` | Update own `name`, `rollNo`, `division`, `program`, `semester` |
| POST | `/join-mentor` | Body `{ code }`. Look up mentor by `mentorCode`, set `req.user.mentor`. 404 on bad code. |
| DELETE | `/mentor` | Unlink from current mentor (sets `mentor: null`) |

#### Student-facing — `routes/applications.js` (new, mount at `/api/applications`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Submit. Multipart when an attachment is present. Rejects if student has no mentor. Sets `mentor` from the student's current mentor. |
| GET | `/` | List own applications, newest first. Supports `?status=` |
| GET | `/:id` | Own application detail (404 if not owner) |
| PATCH | `/:id/withdraw` | Only allowed while `status === 'pending'` |
| GET | `/:id/attachment` | Streams/redirects to a signed URL. Allowed for the owning student **or** the assigned mentor only. |

#### Mentor-facing — `routes/mentor.js` (new, mount at `/api/mentor`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/overview` | Dashboard aggregate: mentee count, at-risk count, pending application count, mentorCode |
| GET | `/mentees` | List of mentees with summary: name, rollNo, division, overall attendance %, at-risk bool, pending app count, last sync |
| GET | `/mentees/:studentId` | Full detail: profile, per-subject attendance rows, grades, class backlog, recent applications |
| DELETE | `/mentees/:studentId` | Remove a mentee (sets their `mentor` to null) |
| GET | `/applications` | Inbox. `?status=pending` default. Populates student name/rollNo. |
| PATCH | `/applications/:id` | Body `{ status: 'approved'\|'rejected', mentorRemarks }`. Sets `decidedAt`, `decidedBy`. Only from `pending`. |
| POST | `/code/regenerate` | Issue a new `mentorCode` |

Every `:studentId` route calls `assertIsMyMentee` first.
For `PATCH /applications/:id`, load the application and verify `application.mentor` equals `req.user.id` — do not rely on the id alone.

### 5.5 Attendance percentage + at-risk

Reuse the existing convention: attended = `conductedClasses - absentClasses`, percentage =
`attended / conductedClasses * 100`, at-risk when below **75**. Guard against `conductedClasses === 0`
(report `null`, not `NaN`). Put this in a shared helper so mentor and student views cannot drift apart.

---

## 6. File uploads (medical certificates)

### 6.1 Why Cloudinary and not the disk

**The Hugging Face Space has an ephemeral filesystem.** Anything written to local disk is destroyed on
every restart or rebuild. Do not use `multer.diskStorage`. MongoDB is also unsuitable — the Atlas free
tier is 512 MB total and shared with all app data.

Use **Cloudinary** (free tier). Add `cloudinary` to `backend/package.json`.

New env vars (add to `backend/.env` locally and to the HF Space secrets):

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 6.2 Upload rules

- Use `multer.memoryStorage()` — the repo already does this in `routes/notes.js`; follow that pattern.
- **Max 5 MB.** Enforce via multer `limits` AND re-check `file.size`.
- **Allowlist**: `image/jpeg`, `image/png`, `application/pdf` only.
- **Do not trust the client MIME type.** Verify magic bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `25 50 44 46`. Reject on mismatch.
- Upload with `type: 'authenticated'` and a folder like `studysync/applications`.
- Persist only `public_id`, `format`, `bytes`, `originalName`. **Never persist a public URL.**

### 6.3 Serving rules

`GET /api/applications/:id/attachment` must:

1. Load the application.
2. Authorize: caller is `application.student` **or** `application.mentor`. Otherwise 403.
3. Generate a **signed URL valid for ~60 seconds** (`cloudinary.utils.private_download_url` or a signed
   delivery URL with `type: 'authenticated'`).
4. Redirect to it.

A medical certificate must never be reachable by guessing a URL.

### 6.4 Deletion

When an application is withdrawn or deleted, destroy the Cloudinary asset by `public_id`.

---

## 7. Frontend implementation

### 7.1 Routing

`src/App.jsx` uses **state-based view switching, not react-router**. Do not introduce react-router.
Follow the existing pattern:

```jsx
{view === 'attendance' && <AttendancePage onNavigate={onNavigate} />}
```

Branch the nav and available views on `user.role`. Store `role` in the `user` object already persisted
to `localStorage` at login.

### 7.2 Navigation

`src/components/Layout.jsx` holds a `navItems` array rendered as a floating pill nav. Make it role-aware:

- **student**: Dashboard, Attendance, Classes, Marks, Subjects, Notes, Planner, **Applications**
- **mentor**: **Mentor Dashboard, Mentees, Applications**, Profile

A mentor must not see the student-only pages at all. Keep the pill nav from overflowing on mobile — it
is already near capacity, so consider a compact label for the new item.

### 7.3 New pages (`src/components/`)

| File | Role | Contents |
|---|---|---|
| `MentorDashboardPage.jsx` | mentor | Summary tiles (mentees, at-risk, pending applications), the shareable mentor code, at-risk mentee list |
| `MenteesPage.jsx` | mentor | Searchable mentee table; attendance % with risk colouring; click through to detail |
| `MenteeDetailPage.jsx` | mentor | One student: profile, per-subject attendance, marks, class backlog, their applications |
| `MentorApplicationsPage.jsx` | mentor | Inbox; filter by status; approve/reject with remarks; view attachment |
| `ApplicationsPage.jsx` | student | Submit form + list of own applications with status |
| `ProfilePage.jsx` | both | Edit profile; students join a mentor by code and see who their mentor is |

### 7.4 API client

Extend `src/api/index.js` following the existing per-domain object pattern:

```js
export const mentorAPI = {
  getOverview:      ()               => api.get('/mentor/overview'),
  getMentees:       ()               => api.get('/mentor/mentees'),
  getMentee:        (id)             => api.get(`/mentor/mentees/${id}`),
  removeMentee:     (id)             => api.delete(`/mentor/mentees/${id}`),
  getApplications:  (status)         => api.get('/mentor/applications', { params: { status } }),
  decideApplication:(id, data)       => api.patch(`/mentor/applications/${id}`, data),
  regenerateCode:   ()               => api.post('/mentor/code/regenerate'),
};

export const applicationsAPI = {
  submit:   (formData) => api.post('/applications', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll:   (status)   => api.get('/applications', { params: { status } }),
  withdraw: (id)       => api.patch(`/applications/${id}/withdraw`),
};

export const profileAPI = {
  get:         ()      => api.get('/profile'),
  update:      (data)  => api.patch('/profile', data),
  joinMentor:  (code)  => api.post('/profile/join-mentor', { code }),
  leaveMentor: ()      => api.delete('/profile/mentor'),
};
```

The axios instance already injects the JWT via an interceptor — do not add auth headers manually.

### 7.5 Design system — match it exactly

Tailwind theme is a warm "field atlas" palette defined in `tailwind.config.mjs`. Use the tokens, never
raw hex:

- Surfaces: `bg-paper` (page), `bg-parchment` (cards), `bg-map` (inset wells)
- Text: `text-ink`, `text-ink-muted`, `text-ink-faint`
- Borders: `border-sand`, `border-sand-dark`
- Accent: `ember` (single accent), `sage` (good/pass), `trail` (informational), `caution` (warning), `danger` (at risk)
- Fonts: `font-display` for headings, `font-sans` for body
- Cards: `rounded-2xl border border-sand shadow-sm p-4 sm:p-5`
- Page header pattern: a tiny uppercase `text-ember-dark tracking-widest` eyebrow above an
  `text-2xl sm:text-3xl font-display font-bold` title

Copy the structure of `src/components/ClassCountPage.jsx` — it is the newest page and the best reference
for layout, loading states, error banners and empty states. Mobile-first: the nav is a floating bottom
pill, so every page needs bottom padding (`Layout` already applies `pb-32`).

---

## 8. Build order

### Phase 0 — Foundation (must land first and land correctly)

1. Extend `User` schema (§4.1).
2. `requireRole` middleware (§5.1).
3. `assertIsMyMentee` helper (§3.2).
4. Mentor code generation (§5.2).
5. Registration/login role support (§5.3).
6. `routes/profile.js` + mount in `server.js`.
7. Run the migration in §9.
8. Frontend: role in `localStorage` user object, role-aware nav, `ProfilePage`.

**Acceptance:** a mentor can register with the signup code and see their code; a student can join with
that code and see their mentor's name; a student who tries `/api/mentor/overview` gets 403.

### Phase 1 — Mentor read-only dashboard

1. `routes/mentor.js` with `/overview`, `/mentees`, `/mentees/:studentId`, `DELETE /mentees/:studentId`.
2. Shared attendance/at-risk helper (§5.5).
3. `MentorDashboardPage`, `MenteesPage`, `MenteeDetailPage`.

**Acceptance:** a mentor sees only their own mentees; requesting a non-mentee's id returns 403; no
endpoint response anywhere contains SAP credentials, notes or todos.

### Phase 2 — Applications workflow

1. `models/Application.js`.
2. Cloudinary integration (§6).
3. `routes/applications.js` (student side).
4. Mentor inbox + decide endpoints.
5. `ApplicationsPage` (student), `MentorApplicationsPage` (mentor).

**Acceptance:** a student submits sick leave with a PDF certificate; it appears in their mentor's inbox
and nobody else's; the mentor approves with remarks; the student sees the updated status and remarks;
a second mentor requesting that attachment gets 403.

---

## 9. Migration

Existing users predate the `role` field. Run once against Atlas:

```js
db.users.updateMany({ role: { $exists: false } }, { $set: { role: 'student', mentor: null } })
```

Do this **before** deploying Phase 0, so no request ever sees a user without a role.
Nothing else needs backfilling — all new fields have safe defaults.

---

## 10. Deployment

The frontend and backend deploy to **different places from the same repo**.

**Frontend (Vercel)** — automatic on push:

```bash
git push origin main
```

**Backend (Hugging Face Space)** — the Space's root is the `backend/` folder, pushed as a subtree:

```bash
git subtree push --prefix backend space main
```

If that is rejected for non-fast-forward history (it usually is), use:

```bash
git push space "$(git subtree split --prefix backend main)":main --force
```

### Deployment gotchas

- `backend/README.md` carries the Hugging Face frontmatter (`sdk: docker`). **Never delete it** — the
  Space fails to build without it.
- The backend must listen on **port 7860** (already configured).
- The Space filesystem is **ephemeral** — never write user data to disk.
- New env vars must be added as **Space secrets**, not just to local `.env`.
- New env vars for this work: `MENTOR_SIGNUP_CODE`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`.

---

## 11. Test checklist before calling it done

Security (do these first, they matter most):

- [ ] Student calling any `/api/mentor/*` endpoint gets 403
- [ ] Mentor A requesting Mentor B's mentee by id gets 403
- [ ] Mentor requesting a student who has no mentor set gets 403
- [ ] No response body anywhere contains `encryptedUsername` / `encryptedPassword`
- [ ] Mentor cannot reach any student's notes or todos through any route
- [ ] Attachment URL is not accessible without auth; signed URL expires
- [ ] A student cannot register as a mentor without `MENTOR_SIGNUP_CODE`
- [ ] A student cannot set their own `role` via `PATCH /api/profile`

Functional:

- [ ] Mentor code round-trip: generate, share, student joins, appears in mentee list
- [ ] Attendance % on the mentee list matches the student's own Attendance page exactly
- [ ] Application: submit → pending → approve with remarks → student sees status
- [ ] Withdraw works only while pending
- [ ] Upload rejects a 6 MB file, a `.exe` renamed to `.pdf`, and an empty file
- [ ] Removing a mentee revokes the mentor's access immediately

Regression (existing features must be untouched):

- [ ] Student attendance sync still works, manual and nightly
- [ ] Class Count page unchanged
- [ ] Marks, notes, planner, todos all still work for students
- [ ] An existing user who logs in after migration lands on the student view as before

---

## 12. Phase 3 backlog — do not build yet

1. **Mentor meeting log** — record mentor-mentee interactions. Real value: colleges need this for NAAC documentation and currently keep it on paper.
2. **Report export (PDF/Excel)** — printable mentee attendance records for official files. `jspdf` and `jspdf-autotable` are already dependencies.
3. **Status notifications** — in-app first, email later.
4. **Cohort analytics** — which subject is systematically weak across a division.
5. **Aggregate cancelled-class report** — reuse the Class Count backlog across all mentees so a mentor or HOD can see which subjects are behind schedule. Nothing comparable exists in the college today.
6. **Announcements** — mentor broadcasts to mentees.
7. **CSV bulk mentee import** — only worth building if the college provides official allocation lists.
8. **Admin role** — department-level oversight across mentors.
