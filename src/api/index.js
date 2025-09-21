import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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

export default api;
