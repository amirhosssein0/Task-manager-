'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '../lib/config';
import SubscriptionModal from '../components/SubscriptionModal';

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  due_date: string;
  category?: string;
  created_at: string;
}

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  tasks_by_category: Record<string, number>;
  tasks_by_date: Array<{
    date: string;
    total: number;
    completed: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentTasks();
  }, [selectedPeriod]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/dashboard/?period=${selectedPeriod}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tasks/recent/`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setRecentTasks(data);
      }
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-gray-100">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600 dark:text-red-400">Failed to load dashboard</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {stats && (
        <div className="mb-4">
          {/* @ts-ignore allow extra keys from backend */}
          {(stats as any).subscription_plan === 'trial' && (stats as any).subscription_status === 'active' && ((stats as any).trial_days_remaining ?? 0) > 0 ? (
            <div className="rounded-lg p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center justify-between">
                <span>
                  Free trial days remaining: <strong className="text-lg">{(stats as any).trial_days_remaining}</strong> days
                </span>
              </div>
            </div>
          ) : (stats as any).subscription_plan === 'trial' && ((stats as any).subscription_status === 'expired' || ((stats as any).trial_days_remaining ?? 0) === 0) ? (
            <div className="rounded-lg p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between">
              <span className="font-medium">Your trial has ended. Please subscribe to continue using the service.</span>
              <button
                onClick={() => setShowSubscribe(true)}
                className="px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap"
              >
                Subscribe Now
              </button>
            </div>
          ) : (stats as any).subscription_plan !== 'trial' && (stats as any).subscription_status === 'active' ? (
            <div className="rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
              <span>Active subscription: <strong>{(stats as any).subscription_plan === 'monthly' ? 'Monthly ($20)' : 'Yearly ($200)'}</strong></span>
            </div>
          ) : null}
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard</h1>
        
        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'today'
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.total_tasks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.completed_tasks}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.pending_tasks}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {stats.completion_rate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tasks by Category */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tasks by Category</h2>
          {Object.keys(stats.tasks_by_category).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No categories yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.tasks_by_category).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{category || 'Uncategorized'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.total_tasks) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks by Date */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tasks by Date</h2>
          {stats.tasks_by_date.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No tasks in this period</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.tasks_by_date.map((item) => (
                <div key={item.date} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.completed}/{item.total} completed
                    </span>
                    <div className="w-24 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${item.total > 0 ? (item.completed / item.total) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Tasks</h2>
          <Link
            href="/tasks"
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            View All →
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No recent tasks</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-lg border ${
                  task.completed
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4
                      className={`font-medium ${
                        task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      {task.category && <span>Category: {task.category}</span>}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs ${
                      task.completed
                        ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                        : 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {task.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SubscriptionModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        onSuccess={() => {
          setShowSubscribe(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
}

