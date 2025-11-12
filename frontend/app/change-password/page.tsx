'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '../lib/config';
import { useTheme } from '../components/ThemeProvider';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTempPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('temp_password_used') === 'true';
    }
    return false;
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Only require old_password if not using temp password
    if (!isTempPassword && !formData.old_password) {
      newErrors.old_password = 'Current password is required';
    }

    if (!formData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }

    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/auth/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(isTempPassword ? {} : { old_password: formData.old_password }),
          new_password: formData.new_password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear temp password flag
        localStorage.removeItem('temp_password_used');
        alert('Password changed successfully!');
        router.push('/profile');
      } else {
        if (data.old_password) {
          setErrors({ old_password: data.old_password[0] });
        } else if (data.new_password) {
          setErrors({ new_password: data.new_password[0] });
        } else if (data.detail) {
          setErrors({ general: data.detail });
        } else {
          setErrors({ general: 'Failed to change password' });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrors({ general: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'
      } bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100`}
    >
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-lg border border-gray-200 dark:border-slate-700">
        <div>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {isTempPassword ? 'Set New Password' : 'Change Password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isTempPassword
              ? 'Please set a new password for your account'
              : 'Enter your current password and choose a new one'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {isTempPassword && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-medium">لطفا رمز عبور خود را تغییر دهید</p>
            </div>
          )}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {!isTempPassword && (
              <div>
                <label htmlFor="old_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="old_password"
                    name="old_password"
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={formData.old_password}
                    onChange={handleChange}
                    className={`mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border ${
                      errors.old_password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                    } bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    {showOldPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.old_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.old_password}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  name="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={formData.new_password}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.new_password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                  } bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.new_password && (
                <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.confirm_password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                  } bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/profile"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
            >
              Back to Profile
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

