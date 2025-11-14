'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Navigation() {
  const router = useRouter();

  const getIsAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      if (payload?.exp && payload.exp * 1000 > Date.now()) {
        return true;
      }
    } catch (error) {
      // fall through to cleanup below
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return false;
  };

  // Always start with false to avoid hydration mismatch
  // Will be updated in useEffect after mount
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(getIsAuthenticated());
    };

    // Initial check after mount
    syncAuthState();
    
    // Listen for auth changes
    window.addEventListener('auth-change', syncAuthState);
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('focus', syncAuthState);

    return () => {
      window.removeEventListener('auth-change', syncAuthState);
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('focus', syncAuthState);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new Event('auth-change'));
    setIsAuthenticated(false);
    setMobileOpen(false);
    router.push('/login');
  };

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
            <Link
              href="/"
              className="text-lg sm:text-xl font-semibold text-emerald-700 dark:text-emerald-400"
              onClick={() => setMobileOpen(false)}
            >
              Task Manager
            </Link>
            <div className="hidden md:flex gap-1">
              <Link
                href="/tasks"
                className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Tasks
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/about"
                className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-3 sm:px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-2 border-t border-gray-200 dark:border-slate-700">
            <div className="flex flex-col gap-1">
              <Link
                href="/tasks"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                Tasks
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/about"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
