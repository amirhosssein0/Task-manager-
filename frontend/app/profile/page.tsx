'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '../lib/config';
import { authenticatedFetch, getValidAccessToken } from '../lib/api';
import Link from 'next/link';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  date_joined: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  due_date: string;
  category?: string;
  created_at: string;
}

interface BillingStatus {
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  transaction_id?: string;
  trial_days_remaining?: number;
  days_remaining?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [uploading, setUploading] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchUserTasks();
    fetchBillingStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/auth/profile/`);

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
        });
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const [taskPagination, setTaskPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
    currentPage: number;
  } | null>(null);

  const fetchUserTasks = async (page: number = 1) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/user-tasks/?page=${page}`);

      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        if (data.results) {
          setTasks(data.results);
          setTaskPagination({
            count: data.count,
            next: data.next,
            previous: data.previous,
            currentPage: page,
          });
        } else {
          // Fallback for non-paginated response
          setTasks(data);
          setTaskPagination(null);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchBillingStatus = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/billing/status/`);

      if (response.ok) {
        const data = await response.json();
        setBilling(data);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setBilling(null);
      }
    } catch (error) {
      console.error('Error fetching billing status:', error);
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/auth/profile/`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const token = await getValidAccessToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/api/auth/profile/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        alert('Profile picture updated!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE}/api/auth/delete-account/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const getTasksByCategory = () => {
    const categorized: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      const category = task.category || 'Uncategorized';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(task);
    });
    return categorized;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Failed to load profile</div>
      </div>
    );
  }

  const categorizedTasks = getTasksByCategory();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-8 border-b">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
              {profile.profile_picture ? (
                (() => {
                  const raw = (profile.profile_picture as unknown as string) || '';
                  const base =
                    typeof window !== 'undefined'
                      ? (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:8089'
                      : '';
                  if (raw.startsWith('http')) {
                    return (
                      <img
                        src={raw}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    );
                  }
                  const clean = raw.startsWith('/') ? raw.slice(1) : raw;
                  const normalized = `${base}/${clean}`;
                  return (
                    <img
                      src={normalized}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  );
                })()
              ) : (
                <span className="text-4xl text-emerald-700 dark:text-emerald-400 font-bold">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {!editing && (
              <label className="absolute bottom-0 right-0 bg-emerald-700 dark:bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <span className="text-xs">📷</span>
              </label>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{profile.username}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.email}</p>
            {profile.first_name || profile.last_name ? (
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {profile.first_name} {profile.last_name}
              </p>
            ) : null}
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Member since {new Date(profile.date_joined).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      first_name: profile.first_name || '',
                      last_name: profile.last_name || '',
                      email: profile.email || '',
                    });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Edit Profile
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Subscription Details */}
        <div className="mt-8 border rounded-lg p-6 bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Subscription
            </h2>
            <Link
              href="/dashboard"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Manage subscription
            </Link>
          </div>
          {billingLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading subscription details...
            </p>
          ) : !billing ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subscription information available.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-200">
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">Plan</p>
                <p className="capitalize">
                  {billing.plan === 'trial'
                    ? 'Free Trial'
                    : billing.plan === 'monthly'
                    ? 'Monthly'
                    : 'Yearly'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    billing.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}
                >
                  {billing.status}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Start Date
                </p>
                <p>
                  {billing.start_date
                    ? new Date(billing.start_date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Ends On
                </p>
                <p>
                  {billing.end_date
                    ? new Date(billing.end_date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              {billing.plan === 'trial' && (
                <div className="space-y-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Trial Days Remaining
                  </p>
                  <p>{billing.trial_days_remaining ?? billing.days_remaining ?? 0} days</p>
                </div>
              )}
              {billing.plan !== 'trial' && (
                <div className="space-y-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Renews In
                  </p>
                  <p>{billing.days_remaining ?? 0} days</p>
                </div>
              )}
              {billing.transaction_id && (
                <div className="space-y-1 md:col-span-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Last Transaction
                  </p>
                  <p className="font-mono text-sm">{billing.transaction_id}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task History by Category */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Task History by Category</h2>
          {Object.keys(categorizedTasks).length === 0 ? (
            <p className="text-gray-500">No tasks yet</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(categorizedTasks).map(([category, categoryTasks]) => (
                <div key={category} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{category}</h3>
                  <div className="space-y-2">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border ${
                          task.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              task.completed
                                ? 'bg-green-200 text-green-800'
                                : 'bg-yellow-200 text-yellow-800'
                            }`}
                          >
                            {task.completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {taskPagination && taskPagination.count > 10 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((taskPagination.currentPage - 1) * 10) + 1} to {Math.min(taskPagination.currentPage * 10, taskPagination.count)} of {taskPagination.count} tasks
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchUserTasks(taskPagination.currentPage - 1)}
                  disabled={!taskPagination.previous}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchUserTasks(taskPagination.currentPage + 1)}
                  disabled={!taskPagination.next}
                  className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Settings */}
        <div className="mt-8 pt-8 border-t space-y-4">
          <div>
            <Link
              href="/change-password"
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Change Password
            </Link>
          </div>
          <div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

