<div align="center">

# 🧭 StudySync

**Your semester, mapped.**

A production-grade academic dashboard used by real students at NMIMS Shirpur.  
Track attendance via SAP automation, manage marks, generate AI study materials,  
and now — a complete **faculty mentor management system**.

[![Live](https://img.shields.io/badge/🌐_Live-studysync--inky.vercel.app-E76F51?style=for-the-badge)](https://studysync-inky.vercel.app/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-A79E8B?style=for-the-badge)](LICENSE)

</div>

---

## ✨ What is StudySync?

StudySync isn't a toy project — it's a **deployed, multi-user platform** solving real problems for real students. The college's SAP portal is clunky, attendance data is hard to interpret, and there's zero mentor management infrastructure. StudySync fixes all of that.

### For Students
- 📊 **Live Attendance Dashboard** — automated SAP portal scraping via Playwright, with manual + nightly cron sync
- 📈 **Marks Hub** — track midterms, assignments, finals with interactive charts and a "What If?" goal calculator
- 🗓️ **Class Count Engine** — projects how many lectures/labs your professors owe you based on weekly schedule vs SAP data
- 🤖 **AI Study Tools** — powered by Google Gemini: auto-generated notes, quizzes, adaptive study planner, contextual chatbot
- 📝 **Smart Planner** — upload course policy docs, and AI builds a personalized study plan using your attendance + grades
- 📤 **PDF/CSV Export** — professionally formatted attendance reports
- 📋 **Applications** — submit sick leave, test absence requests with medical certificates to your mentor

### For Faculty Mentors *(New!)*
- 🎓 **Mentor Dashboard** — see all assigned mentees at a glance: at-risk count, pending applications, overall stats
- 👥 **Mentee Management** — searchable student list with per-subject attendance breakdowns, grades, and class backlog
- 📬 **Application Inbox** — review and decide on student applications (approve/reject with remarks)
- 🔗 **Code-Based Assignment** — share a unique `MNT-XXXXX` code; students self-enroll with zero admin overhead
- 🔒 **Security-First** — strict data boundaries: mentors see only their own mentees, never SAP credentials or personal notes

---

## 🏗️ Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│      Frontend (Vercel)      │      │    Backend (HF Space/Docker) │
│                             │      │                              │
│  React 19 + Vite + Tailwind │◄────►│  Express.js (ESM)            │
│  State-based view switching │      │  Mongoose ODM                │
│  Warm "field atlas" design  │      │  JWT Auth                    │
│  Lucide icons               │      │  Playwright SAP scraper      │
│                             │      │  Google Gemini AI            │
└─────────────────────────────┘      │  Cloudinary (medical certs)  │
                                     │  Role-based access control   │
                                     └──────────┬───────────────────┘
                                                │
                                     ┌──────────▼───────────────────┐
                                     │     MongoDB Atlas            │
                                     │     (Users, Subjects,        │
                                     │      Grades, Applications)   │
                                     └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS, Lucide React, Axios |
| **Backend** | Node.js, Express.js (ESM), Multer |
| **Database** | MongoDB Atlas, Mongoose 8 |
| **Auth** | JWT + bcrypt, role-based middleware (`student` / `mentor`) |
| **AI** | Google Gemini API (notes, quizzes, planner, chatbot) |
| **Automation** | Playwright (SAP portal scraping with nightly cron) |
| **File Storage** | Cloudinary (authenticated uploads, signed URLs) |
| **Deployment** | Vercel (frontend), Hugging Face Spaces + Docker (backend) |
| **Fonts** | Bricolage Grotesque, Atkinson Hyperlegible |

---

## 📂 Project Structure

```
studysync/
├── src/                          # React frontend
│   ├── App.jsx                   # Role-aware view switching (no react-router)
│   ├── api/index.js              # Axios client with per-domain API objects
│   └── components/
│       ├── AuthPage.jsx          # Login/Register (with mentor toggle)
│       ├── Layout.jsx            # Role-aware floating pill nav
│       ├── DashboardPage.jsx     # Student overview with charts
│       ├── AttendancePage.jsx    # SAP-synced attendance tracker
│       ├── ClassCountPage.jsx    # Lecture/lab backlog projections
│       ├── MarksPage.jsx         # Grades with goal calculator
│       ├── NotesPage.jsx         # AI-generated study materials
│       ├── PlannerPage.jsx       # AI adaptive study planner
│       ├── ProfilePage.jsx       # Dual-role profile + mentor code join
│       ├── ApplicationsPage.jsx  # Student leave applications
│       ├── MentorDashboardPage.jsx   # Mentor overview tiles
│       ├── MenteesPage.jsx           # Searchable mentee list
│       ├── MenteeDetailPage.jsx      # Student deep-dive
│       └── MentorApplicationsPage.jsx # Application inbox
│
├── backend/
│   ├── server.js                 # Express app + route mounts
│   ├── middleware/
│   │   ├── auth.js               # JWT auth → req.user
│   │   └── requireRole.js        # Role-gating middleware
│   ├── models/
│   │   ├── User.js               # Roles, profile, mentor link
│   │   ├── Subject.js            # Attendance + class data
│   │   ├── Grade.js              # Exam scores
│   │   ├── Application.js        # Leave/absence requests
│   │   ├── SapCredentials.js     # Encrypted SAP login
│   │   ├── Note.js               # AI-generated content
│   │   └── Todo.js               # Task management
│   ├── routes/
│   │   ├── auth.js               # Register/Login (role support)
│   │   ├── profile.js            # Profile CRUD + mentor join/leave
│   │   ├── mentor.js             # Mentor dashboard + mentee mgmt
│   │   ├── applications.js       # Submit/withdraw + attachment access
│   │   ├── subjects.js, grades.js, todos.js, dashboard.js
│   │   ├── notes.js              # AI generation endpoints
│   │   └── sap.js                # SAP sync + credentials
│   └── services/
│       ├── mentorAuth.js         # assertIsMyMentee() choke-point
│       ├── mentorCode.js         # MNT-XXXXX code generation
│       ├── attendanceHelper.js   # Shared attendance % + at-risk
│       ├── cloudinary.js         # Upload/sign/delete
│       ├── aiService.js          # Gemini integration
│       ├── sapScraper.js         # Playwright SAP automation
│       └── syncRunner.js         # Sync orchestration + cron
│
└── tailwind.config.mjs           # "Field atlas" warm palette
```

---

## 🔐 Security Model

StudySync handles real student academic records. Security is not optional.

| Principle | Implementation |
|---|---|
| **Ownership isolation** | All 25+ student queries filter by `user: req.user.id` — untouched by mentor feature |
| **Single auth choke-point** | Every mentor route calls `assertIsMyMentee()` before touching student data |
| **Role enforcement** | `requireRole('mentor')` middleware on all `/api/mentor/*` routes |
| **No self-promotion** | Mentor registration requires a server-side `MENTOR_SIGNUP_CODE` |
| **Data boundaries** | Mentors never see: SAP credentials, personal notes, todos, password hashes |
| **Authenticated uploads** | Medical certificates stored as Cloudinary `type: 'authenticated'` — never public |
| **Signed URLs** | Attachment access via 60-second signed URLs with caller verification |
| **Magic byte validation** | File uploads verify JPEG/PNG/PDF magic bytes — don't trust client MIME type |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or [Atlas free tier](https://www.mongodb.com/atlas))
- **Cloudinary** account ([free signup](https://cloudinary.com/users/register_free)) — for medical certificate uploads

### 1. Clone & Install

```bash
git clone https://github.com/Jay-Naik2526/studysync.git
cd studysync

# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173

# AI (Google Gemini)
GEMINI_API_KEY_1=your-gemini-key

# Mentor system
MENTOR_SIGNUP_CODE=your-chosen-code

# File uploads (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend (from project root)
npm run dev
```

Open **http://localhost:5173** — register an account and start using StudySync.

---

## 🧪 Test the Mentor Flow

1. **Register a mentor** → Sign up → toggle "Register as Mentor" → enter your `MENTOR_SIGNUP_CODE`
2. **Copy your code** → Mentor lands on dashboard, sees their `MNT-XXXXX` code
3. **Student joins** → Log in as student → Profile → enter the code
4. **Mentor sees mentees** → Mentees page shows the student with live attendance data
5. **Student submits leave** → Applications → New Application → attach medical certificate
6. **Mentor reviews** → Inbox → Approve/Reject with remarks → student sees the decision

---

## 🚢 Deployment

| Component | Platform | Method |
|---|---|---|
| **Frontend** | Vercel | Auto-deploy on `git push origin main` |
| **Backend** | Hugging Face Spaces | `git subtree push --prefix backend space main` |

The backend runs in a Docker container on port 7860. Set all `backend/.env` variables as HF Space secrets.

> **⚠️ Note:** The HF Space filesystem is ephemeral — never write user data to disk. That's why Cloudinary handles file storage.

---

## 🗺️ Roadmap

- [x] Student attendance dashboard with SAP automation
- [x] Marks hub with goal calculator
- [x] AI study notes, quizzes, and planner (Gemini)
- [x] Class count backlog engine
- [x] Mentor role with code-based student assignment
- [x] Application workflow (submit → review → decide)
- [x] Medical certificate uploads (Cloudinary)
- [ ] Mentor meeting log (for NAAC documentation)
- [ ] PDF/Excel report export for mentors
- [ ] In-app status notifications
- [ ] Cohort analytics (weak subjects across a division)
- [ ] Aggregate cancelled-class reports across mentees
- [ ] Mentor announcements (broadcast to mentees)
- [ ] Admin role (department-level oversight)

---

## 👤 Author

**Jay Naik**

- GitHub: [@Jay-Naik2526](https://github.com/Jay-Naik2526)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

*Built with ☕ and 🎯 for the students and faculty of NMIMS Shirpur.*

</div>
