# StudySync - Student Dashboard

A full-stack student dashboard application built with React, Node.js, Express, and MongoDB.

## Features

- **Student Dashboard**: View attendance, grades, and recent activities
- **Authentication**: Secure login/logout system
- **Real-time Data**: Dynamic data from backend API
- **Responsive Design**: Works on desktop and mobile devices
- **Teacher Portal**: Teachers can mark attendance and add grades
- **Activity Tracking**: Monitor student progress and activities

## Tech Stack

**Frontend:**
- React 19
- Tailwind CSS
- Axios for API calls
- Vite for development

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/studysync
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Setup

Make sure MongoDB is running on your system, then seed the database:

```bash
cd backend
node seed.js
```

This will create demo accounts:
- **Student**: `student@demo.com` / `password123`
- **Teacher**: `teacher@demo.com` / `password123`

### 4. Start the Application

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Student Data
- `GET /api/student/dashboard` - Get student dashboard data

### Attendance
- `POST /api/attendance/mark` - Mark attendance (teachers only)
- `GET /api/attendance/student/:studentId` - Get student attendance

### Grades
- `POST /api/grades/add` - Add grade (teachers only)
- `GET /api/grades/student/:studentId` - Get student grades
- `PUT /api/grades/:gradeId` - Update grade
- `DELETE /api/grades/:gradeId` - Delete grade

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject (teachers only)

### Activities
- `GET /api/activity` - Get user activities

## Demo Data

The seeded database includes:
- 1 Student (John Doe)
- 1 Teacher (Jane Smith)
- 5 Subjects (Math, Physics, Chemistry, English, Biology)
- Sample grades and attendance records
- Recent activity logs

## License

MIT License+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
