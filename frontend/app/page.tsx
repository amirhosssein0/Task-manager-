'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SubscriptionModal from './components/SubscriptionModal';
import { API_BASE } from './lib/config';

export default function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [billing, setBilling] = useState<{ plan?: string; status?: string; trial_days_remaining?: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsAuthed(!!token);
    // fetch billing status if logged in
    if (token) {
      fetch(`${API_BASE}/api/billing/status/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && setBilling(data))
        .catch(() => {});
    } else {
      setBilling(null);
    }
  }, []);

  const handleSubscriptionSuccess = () => {
    // refresh billing after successful subscribe
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(`${API_BASE}/api/billing/status/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setBilling(data))
      .catch(() => {});
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
          Welcome to Task Manager
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6">
          Organize your life, one task at a time
        </p>
        {isAuthed && billing && (
          <div className="mb-6">
            {billing.status === 'active' && billing.plan !== 'trial' ? (
              <span className="inline-block px-3 py-1 rounded-full text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                Premium active ({billing.plan})
              </span>
            ) : billing.plan === 'trial' ? (
              <span className="inline-block px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                Trial days remaining: {billing.trial_days_remaining ?? 0}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <Link
            href={isAuthed ? '/tasks' : '/signup'}
            className="px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 font-medium transition-colors"
          >
            Get Started
          </Link>
          {!isAuthed && (
            <Link
              href="/login"
              className="px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Task Management</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Create, organize, and track your tasks with ease.
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Analytics</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Track your productivity and analyze performance.
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Secure</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Your data is protected with industry-standard security.
          </p>
        </div>
      </div>

      <div className="mt-16 bg-emerald-700 dark:bg-emerald-800 rounded-lg p-8 text-white text-center">
        <h2 className="text-2xl font-semibold mb-3">Ready to boost your productivity?</h2>
        <p className="text-base mb-4 opacity-90">
          {isAuthed && billing && billing.status === 'active' && billing.plan !== 'trial' ? (
            <>🎉 You're on Premium Plan!</>
          ) : isAuthed && billing && billing.plan === 'trial' ? (
            <>Free trial days remaining: {billing.trial_days_remaining ?? 0}</>
          ) : (
            <>Get 14 days free, then $20/month or $200/year</>
          )}
        </p>
        {isAuthed ? (
          billing && billing.status === 'active' && billing.plan !== 'trial' ? (
            <div className="mt-4">
              <span className="px-6 py-3 bg-white/20 text-white rounded-lg font-medium inline-block">
                Premium Active
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-3 bg-white text-emerald-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
            >
              Subscribe Now
            </button>
          )
        ) : (
          <Link
            href="/signup"
            className="inline-block mt-4 px-6 py-3 bg-white text-emerald-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Create Account
          </Link>
        )}
      </div>

      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSubscriptionSuccess}
      />
    </div>
  );
}
