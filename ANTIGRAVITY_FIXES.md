# StudySync — Audit Fixes

Findings from a security and layout audit of the mentor module. Work top to bottom;
items 1 and 2 are security issues and should land first.

Context: Node/Express ESM backend in `backend/`, React + Vite + Tailwind frontend in `src/`.
Backend deploys to Hugging Face Spaces as a subtree, frontend to Vercel. Tokens no longer
expire (this was changed deliberately — do not re-add `expiresIn`).

---

## 1. [HIGH] Unauthenticated file uploads are buffered into memory

`backend/routes/applications.js`, line ~35:

```js
router.post('/', upload.single('attachment'), authMiddleware, async (req, res) => {
```

Multer runs **before** `authMiddleware`. `/api/applications` is mounted without auth in
`server.js` (each route applies it inline), so anyone on the internet can POST a 5 MB file
and have the server parse and hold it in memory before authorization is ever checked.
Repeat that concurrently and the Space runs out of memory.

**Fix:** swap the order so authentication happens first.

```js
router.post('/', authMiddleware, upload.single('attachment'), async (req, res) => {
```

Check every other route in the file for the same ordering mistake. Also add a multer
`limits: { fileSize: 5 * 1024 * 1024, files: 1 }` if it is not already set, so oversized
uploads are rejected during parsing rather than after the whole body is in memory.

**Verify:** `curl -X POST` a 5 MB file to `/api/applications` with no `Authorization`
header — it must return 401 without reading the body.

---

## 2. [HIGH] JWT accepted in the query string

`backend/routes/applications.js`, in `GET /:id/attachment`:

```js
const token = headerToken || req.query.token;
```

Tokens in URLs leak into browser history, server access logs, and `Referer` headers.
This mattered before; it matters much more now that **tokens never expire**, so a token
leaked this way grants permanent access to that account.

**Fix:** remove the `req.query.token` fallback and require the `Authorization` header.
The reason it exists is that the frontend opens attachments in a new tab, which cannot
send headers. Replace that pattern with either:

- **Preferred:** fetch the attachment via axios (header is attached automatically), turn
  the response into a `blob:` URL, and open or download that; revoke it after use. Or
- Have the endpoint return `{ url }` as JSON instead of redirecting, then `window.open`
  the short-lived signed Cloudinary URL — the signed URL is already time-limited, so it
  is far safer in a URL bar than the JWT is.

Update `MentorApplicationsPage.jsx` and `ApplicationsPage.jsx` wherever they build an
attachment link with `?token=`.

Also replace the dynamic `await import('jsonwebtoken')` / `await import('../models/User.js')`
inside that handler with normal top-of-file imports, and reuse `authMiddleware` rather than
re-implementing token verification inline — a second copy of auth logic will drift from the
first.

---

## 3. [MEDIUM] Mentor sees the student UI until they log out and back in

`src/App.jsx` reads `role` from the `user` object in `localStorage`. Anyone who logged in
before the mentor module shipped has a stored user with no `role`, so they fall through to
`'student'` and see student pages even if their account is now a mentor. Because tokens no
longer expire, they will never be forced to re-login and fix it on their own.

**Fix:** on app start, when a token exists, call `GET /api/profile` and refresh the stored
user (including `role`) from the server before rendering. Treat localStorage as a cache,
not the source of truth. Show the existing loading state while that request is in flight.

---

## 4. [MEDIUM] Blank screen on an unset mentee

`src/App.jsx`, line ~93:

```jsx
{role === 'mentor' && view === 'mentee-detail' && selectedMenteeId && (
```

If `view` is `'mentee-detail'` while `selectedMenteeId` is null — a stale view after a
refresh, or a failed navigation — nothing renders at all and the user gets an empty page
with only the nav visible.

**Fix:** add a fallback so an unmatched view never renders nothing. Either redirect to the
role's default view (`mentor-dashboard` / `dashboard`), or render a small "Page not found —
go to dashboard" card. Apply the same guard to any other view that depends on extra state.

---

## 5. [LOW] Verify the new pages at 375px

The bottom navigation was rebuilt and is fixed. The pages themselves still need checking
on a 375px-wide viewport (iPhone SE):

- `MentorDashboardPage.jsx` line ~148 uses `grid-cols-3` for stat tiles — confirm the
  labels do not wrap into an unreadable stack, and drop to `grid-cols-2` on the smallest
  breakpoint if they do.
- `MenteesPage.jsx` and `MenteeDetailPage.jsx` have no `overflow-x-auto` anywhere. If any
  row of stats or data is laid out horizontally, wrap it in a container with
  `overflow-x-auto` so the page body never scrolls sideways.
- Confirm nothing is hidden behind the bottom nav — page content needs bottom padding, and
  `Layout` now applies `pb-28 lg:pb-32`.

Test every new page at 375px, 768px and 1280px. The nav switches from the bottom bar to the
floating pill at `lg` (1024px).

---

## 6. Deployment checklist — confirm these are actually set

The mentor module will fail at runtime if any of these were missed. Verify, don't assume.

- [ ] **Migration ran** against MongoDB Atlas:
      `db.users.updateMany({ role: { $exists: false } }, { $set: { role: 'student', mentor: null } })`
- [ ] Hugging Face Space secrets exist: `MENTOR_SIGNUP_CODE`, `CLOUDINARY_CLOUD_NAME`,
      `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] `cloudinary` is in `backend/package.json` dependencies and in the committed lockfile
- [ ] Backend redeployed after these fixes:
      `git push space "$(git subtree split --prefix backend main)":main --force`
- [ ] `backend/README.md` still present with its `sdk: docker` frontmatter

---

## What the audit found to be correct — do not "fix" these

These were checked and are implemented properly. Leave them alone.

- `assertIsMyMentee` is called on both `/mentees/:studentId` routes.
- `PATCH /mentor/applications/:id` verifies `application.mentor === req.user.id`, rejects
  non-pending applications, and records `decidedAt` / `decidedBy`.
- `PATCH /profile` uses an explicit field allowlist — no role or mentor escalation.
- The attachment endpoint authorizes owner-or-mentor and issues 60-second signed URLs.
- Uploads validate size, an MIME allowlist, and magic bytes, and store to Cloudinary as
  `type: 'authenticated'`.
- Mentor endpoints read only `lastSync lastSyncStatus` from `SapCredentials` — no
  credentials, notes, or todos are exposed to mentors anywhere.
