import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// This interceptor automatically adds your login token to every API request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// If the server ever rejects our token, sign out cleanly instead of letting the 401
// surface as a confusing feature-level error ("Sync failed", "Could not load subjects").
// Tokens no longer expire, but they can still be invalidated by a JWT_SECRET rotation or
// a deleted account, and a stale token in localStorage would otherwise break every page
// with no hint that the fix is simply to log in again.
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthCall && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem('authMessage', 'Your session ended. Please sign in again.');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
};

export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard/dashboard'),
};

export const subjectsAPI = {
  getAll: () => api.get('/subjects'),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

export const gradesAPI = {
  getAll: () => api.get('/grades'),
  create: (gradeData) => api.post('/grades', gradeData),
  update: (id, updateData) => api.put(`/grades/${id}`, updateData),
  delete: (id) => api.delete(`/grades/${id}`),
};

export const todosAPI = {
  getAll: () => api.get('/todos'),
  create: (todoData) => api.post('/todos', todoData),
  update: (id, updateData) => api.put(`/todos/${id}`, updateData),
  delete: (id) => api.delete(`/todos/${id}`),
};

export const notesAPI = {
  generate: (formData) => api.post('/notes/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getBySubject: (subjectId) => api.get(`/notes/${subjectId}`),
  chatAboutNote: (chatData) => api.post('/notes/chat', chatData),
  generatePlanner: (formData) => api.post('/notes/planner', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const sapAPI = {
  saveCredentials: (data)  => api.post('/sap/credentials', data),
  getStatus:       ()      => api.get('/sap/status'),
  sync:            (data)  => api.post('/sap/sync', data),
  setAutoSync:     (enabled) => api.patch('/sap/auto-sync', { enabled }),
  disconnect:      ()      => api.delete('/sap/credentials'),
  saveCalendarUrl: (data)  => api.post('/sap/calendar', data),
  getDeadlines:    ()      => api.get('/sap/deadlines'),
};

export const profileAPI = {
  get:            ()     => api.get('/profile'),
  update:         (data) => api.patch('/profile', data),
  joinMentor:     (code) => api.post('/profile/join-mentor', { code }),
  leaveMentor:    ()     => api.delete('/profile/mentor'),
  regenerateCode: ()     => api.post('/profile/regenerate-code'),
};

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
  getOne:   (id)       => api.get(`/applications/${id}`),
  withdraw: (id)       => api.patch(`/applications/${id}/withdraw`),
};

export default api;
