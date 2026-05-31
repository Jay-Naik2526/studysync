# 🎓 StudySync - The All-in-One Student Dashboard

A modern, full-stack web application designed for students to take full control of their academic life. Track attendance, manage marks, and organize tasks for every subject in one central, intuitive, and multi-user hub.


## ✨ Key Features
StudySync is more than just a tracker; it's a complete toolkit for academic success, built with a professional UI and a robust backend.

Secure Multi-User Authentication: A complete signup and login system using JWT, allowing you and your friends to manage your academic data privately and securely.

Dynamic Main Dashboard: Get a real-time, personalized overview of your overall attendance, average marks, subjects with low attendance, and skippable classes with interactive charts.

Interactive Attendance Tracker:

Dynamically add, delete, and update subjects and their attendance data.

All percentages and skippable class counts are calculated automatically based on an 80% target.

Export your complete attendance report to CSV or a professionally formatted PDF table.

Comprehensive Marks Hub:

A dedicated "Academic Overview" dashboard with dynamic charts for subject performance and task status.

Dynamically add, edit, and delete marks for Midterms, Assignments, and Term End Exams in dedicated sections.

A "What If?" Goal Calculator to determine the scores you need on future assessments to achieve your target grade.

A subject-specific To-Do List to manage and track your tasks.

Fully Responsive Design: A polished and professional UI that works seamlessly on desktop and mobile devices, with smooth animations and transitions.

## 🚀 Live Demo

Live Site: https://studysync-inky.vercel.app/


## 🛠️ Tech Stack
This project is built with the MERN stack and modern development tools for a high-quality developer and user experience.

### Area

Technology

Frontend

React 19 (with Vite), Tailwind CSS, Axios

Backend

Node.js, Express.js

Database

MongoDB (with Mongoose)

Auth

JSON Web Tokens (JWT), bcrypt.js

Deployment

Vercel (Frontend), Render (Backend)

## 🏁 Getting Started
To get a local copy up and running, follow these simple steps.

### Prerequisites
Node.js (v18 or higher recommended)

MongoDB (either a local installation or a free MongoDB Atlas cluster)

Installation & Setup
Clone the repository:

git clone [https://github.com/jay-naik2526/studysync.git](https://github.com/jay-naik2526/studysync.git)
cd studysync

Set up the Backend:

Navigate to the backend directory:

cd backend

Install NPM packages:

npm install

Create a .env file in the backend folder and add your environment variables:

### Your MongoDB connection string from Atlas
MONGODB_URI=mongodb+srv://...

### A long, random string for JWT security
JWT_SECRET=your-super-secret-key-for-development

Start the backend server:

npm start

Your API will now be running on http://localhost:5000.

Set up the Frontend:

Open a new terminal and navigate to the root project directory (studysync).

Install NPM packages:

npm install

Start the frontend development server:

npm run dev

Your application will be running at http://localhost:5173. You can now register a new account and start using the app.

## 🚢 Deployment
This application is deployed using a standard MERN stack workflow:

The Backend API is deployed as a Web Service on Render.

The Frontend UI is deployed as a static site on Vercel.

The Vercel deployment is configured with a VITE_API_BASE_URL environment variable that points to the live Render API URL.

## 👤 Author
Jay Naik

GitHub: @jay-naik2526

## 📄 License
This project is licensed under the MIT License.
