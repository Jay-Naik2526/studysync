import React, { useState } from 'react';
import { authAPI } from '../api';

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isLogin) {
        const response = await authAPI.login({ email, password });
        localStorage.setItem('token', response.data.token);
        onAuthSuccess();
      } else {
        await authAPI.register({ name, email, password });
        setMessage('Registration successful! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1524] flex items-center justify-center text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">{isLogin ? 'StudySync Login' : 'Create Account'}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg transition-colors">{isLogin ? 'Login' : 'Register'}</button>
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          {message && <p className="text-green-500 text-center text-sm">{message}</p>}
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-blue-400 hover:underline ml-2">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
