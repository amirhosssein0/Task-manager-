'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '../lib/config';
import { useTheme } from '../components/ThemeProvider';

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
      } else {
        // Show error message (in debug mode, backend returns detailed error)
        alert(data.email?.[0] || data.detail || 'Failed to send reset email');
        console.error('Password reset error:', data);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
          theme === 'dark' ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'
        } bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100`}
      >
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-lg border border-gray-200 dark:border-slate-700 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Check Your Email</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We&apos;ve sent a temporary password to <strong>{email}</strong>. Please check your inbox
            and use it to login. You&apos;ll be asked to set a new password immediately after login.
          </p>
          <Link
            href="/login"
            className="block mt-6 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'
      } bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100`}
    >
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-lg border border-gray-200 dark:border-slate-700">
        <div>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Forgot Password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we&apos;ll send you a temporary password to reset your account.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm transition-colors"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Temporary Password'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

