'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SubscriptionModal from '../components/SubscriptionModal';
import { API_BASE } from '../lib/config';
import { authenticatedFetch } from '../lib/api';

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  due_date: string;
  category?: string;
  label?: 'none' | 'yellow' | 'green' | 'blue' | 'red';
  created_at: string;
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  recurrence_interval?: number;
  recurrence_days?: number[];
  recurrence_end_date?: string;
  recurrence_count?: number;
  parent_task?: number;
  next_recurrence_date?: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get date from URL query parameter or use today's date
  const getInitialDate = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (dateParam) {
        return dateParam;
      }
    }
    return new Date().toISOString().split('T')[0];
  };
  
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    category: '',
    label: 'none' as 'none' | 'yellow' | 'green' | 'blue' | 'red',
    is_recurring: false,
    recurrence_type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    recurrence_interval: 1,
    recurrence_days: [] as number[],
    recurrence_end_date: '',
    recurrence_count: undefined as number | undefined,
  });
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
    currentPage: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<('none' | 'yellow' | 'green' | 'blue' | 'red')[]>([]);

  // Check URL on mount for date parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (dateParam) {
        setSelectedDate(dateParam);
      }
      // If no date in URL, selectedDate will use its default value (today)
    }
  }, []);

  const fetchTasks = useCallback(async (page: number = 1, dateOverride?: string) => {
    try {
      let url = `${API_BASE}/api/tasks/?page=${page}`;
      
      // Only add due_date filter if we're not showing all tasks
      if (!showAllTasks) {
        const dateToUse = dateOverride || selectedDate;
        if (dateToUse) {
          url += `&due_date=${dateToUse}`;
        }
      }
      
      const response = await authenticatedFetch(url);

      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        if (data.results) {
          setTasks(data.results);
          setPagination({
            count: data.count,
            next: data.next,
            previous: data.previous,
            currentPage: page,
          });
        } else {
          // Fallback for non-paginated response
          setTasks(data);
          setPagination(null);
        }
        setSubscriptionExpired(false);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setTasks([]);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showAllTasks, router]);

  useEffect(() => {
    // Update URL when date changes (but don't reload if it's from URL)
    if (typeof window !== 'undefined' && !showAllTasks) {
      const params = new URLSearchParams(window.location.search);
      const currentDate = params.get('date');
      if (currentDate !== selectedDate) {
        params.set('date', selectedDate);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
    } else if (showAllTasks) {
      // Remove date from URL when showing all tasks
      const params = new URLSearchParams(window.location.search);
      params.delete('date');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
    // Fetch tasks when date or showAllTasks changes
    fetchTasks(1); // Reset to page 1 when date changes
  }, [selectedDate, showAllTasks, fetchTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare data, cleaning up recurring fields for non-recurring tasks
      const taskData: Partial<Task> & { title: string; due_date: string; recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null; recurrence_interval?: number | null; recurrence_days?: number[] | null; recurrence_end_date?: string | null; recurrence_count?: number | null } = {
        title: formData.title,
        description: formData.description || '',
        due_date: formData.due_date || selectedDate,
        category: formData.category || '',
        label: formData.label,
        is_recurring: formData.is_recurring,
      };

      // Only include recurring fields if task is recurring
      if (formData.is_recurring) {
        taskData.recurrence_type = formData.recurrence_type;
        taskData.recurrence_interval = formData.recurrence_interval;
        taskData.recurrence_days = formData.recurrence_days || [];
        taskData.recurrence_end_date = formData.recurrence_end_date || undefined;
        taskData.recurrence_count = formData.recurrence_count || undefined;
      } else {
        // For non-recurring tasks, explicitly set to undefined/empty
        taskData.recurrence_type = undefined;
        taskData.recurrence_interval = 1;
        taskData.recurrence_days = [];
        taskData.recurrence_end_date = undefined;
        taskData.recurrence_count = undefined;
      }

      const response = await authenticatedFetch(`${API_BASE}/api/tasks/`, {
        method: 'POST',
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        const taskData = await response.json();
        // If task has a due_date, update selectedDate to show it
        if (taskData.due_date) {
          const taskDueDate = taskData.due_date.split('T')[0];
          if (taskDueDate !== selectedDate) {
            setSelectedDate(taskDueDate);
            // fetchTasks will be called by useEffect when selectedDate changes
          } else {
            fetchTasks(pagination?.currentPage || 1);
          }
        } else {
          fetchTasks(pagination?.currentPage || 1);
        }
        setFormData({
          title: '',
          description: '',
          due_date: '',
          category: '',
          label: 'none',
          is_recurring: false,
          recurrence_type: 'daily',
          recurrence_interval: 1,
          recurrence_days: [],
          recurrence_end_date: '',
          recurrence_count: undefined,
        });
        setShowAddForm(false);
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      // Prepare data, cleaning up recurring fields for non-recurring tasks
      const taskData: Partial<Task> & { title: string; due_date: string; recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null; recurrence_interval?: number | null; recurrence_days?: number[] | null; recurrence_end_date?: string | null; recurrence_count?: number | null } = {
        title: formData.title,
        description: formData.description || '',
        due_date: formData.due_date,
        category: formData.category || '',
        label: formData.label,
        is_recurring: formData.is_recurring,
      };

      // Only include recurring fields if task is recurring
      if (formData.is_recurring) {
        taskData.recurrence_type = formData.recurrence_type;
        taskData.recurrence_interval = formData.recurrence_interval;
        taskData.recurrence_days = formData.recurrence_days || [];
        taskData.recurrence_end_date = formData.recurrence_end_date || undefined;
        taskData.recurrence_count = formData.recurrence_count || undefined;
      } else {
        // For non-recurring tasks, explicitly set to undefined/empty
        taskData.recurrence_type = undefined;
        taskData.recurrence_interval = 1;
        taskData.recurrence_days = [];
        taskData.recurrence_end_date = undefined;
        taskData.recurrence_count = undefined;
      }

      const response = await authenticatedFetch(`${API_BASE}/api/tasks/${editingTask.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        const taskData = await response.json();
        // If task due_date changed, update selectedDate to show it
        if (taskData.due_date) {
          const taskDueDate = taskData.due_date.split('T')[0];
          if (taskDueDate !== selectedDate) {
            setSelectedDate(taskDueDate);
            // fetchTasks will be called by useEffect when selectedDate changes
          } else {
            fetchTasks(pagination?.currentPage || 1);
          }
        } else {
          fetchTasks(pagination?.currentPage || 1);
        }
        setEditingTask(null);
        setFormData({
          title: '',
          description: '',
          due_date: '',
          category: '',
          label: 'none',
          is_recurring: false,
          recurrence_type: 'daily',
          recurrence_interval: 1,
          recurrence_days: [],
          recurrence_end_date: '',
          recurrence_count: undefined,
        });
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/${id}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTasks(1);
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/${task.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (response.ok) {
        fetchTasks(pagination?.currentPage || 1);
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date.split('T')[0],
      category: task.category || '',
      label: (task.label ?? 'none') as 'none' | 'yellow' | 'green' | 'blue' | 'red',
      is_recurring: task.is_recurring || false,
      recurrence_type: task.recurrence_type || 'daily',
      recurrence_interval: task.recurrence_interval || 1,
      recurrence_days: task.recurrence_days || [],
      recurrence_end_date: task.recurrence_end_date ? task.recurrence_end_date.split('T')[0] : '',
      recurrence_count: task.recurrence_count,
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      due_date: '',
      category: '',
      label: 'none',
      is_recurring: false,
      recurrence_type: 'daily',
      recurrence_interval: 1,
      recurrence_days: [],
      recurrence_end_date: '',
      recurrence_count: undefined,
    });
    setShowAddForm(false);
  };

  // Filter tasks based on search query, categories, and labels
  const getFilteredTasks = () => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) => {
        const titleMatch = task.title.toLowerCase().includes(query);
        const descriptionMatch = task.description?.toLowerCase().includes(query) || false;
        const categoryMatch = (task.category || 'Uncategorized').toLowerCase().includes(query);
        return titleMatch || descriptionMatch || categoryMatch;
      });
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((task) => {
        const category = task.category || 'Uncategorized';
        return selectedCategories.includes(category);
      });
    }

    // Apply label filter
    if (selectedLabels.length > 0) {
      filtered = filtered.filter((task) => {
        const label = task.label || 'none';
        return selectedLabels.includes(label);
      });
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  const getTasksByCategory = () => {
    const categorized: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      const category = task.category || 'Uncategorized';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(task);
    });
    return categorized;
  };

  const categorizedTasks = getTasksByCategory();

  // Get all unique categories from tasks
  const getAllCategories = () => {
    const categories = new Set<string>();
    tasks.forEach((task) => {
      categories.add(task.category || 'Uncategorized');
    });
    return Array.from(categories).sort();
  };

  const allCategories = getAllCategories();

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Toggle label selection
  const toggleLabel = (label: 'none' | 'yellow' | 'green' | 'blue' | 'red') => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedLabels([]);
  };
  const completedCount = filteredTasks.filter((t) => t.completed).length;
  const totalCount = filteredTasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const labelTagClasses: Record<string, string> = {
    yellow: 'bg-yellow-400 text-yellow-900',
    green: 'bg-green-400 text-green-900',
    blue: 'bg-blue-400 text-blue-900',
    red: 'bg-red-400 text-red-900',
  };
  const labelOptions: Array<{
    value: 'none' | 'yellow' | 'green' | 'blue' | 'red';
    name: string;
    className: string;
    showIcon?: boolean;
  }> = [
    { value: 'none', name: 'No Label', className: 'bg-transparent border-dashed border-gray-400 dark:border-slate-400', showIcon: true },
    { value: 'yellow', name: 'Yellow', className: 'bg-yellow-400' },
    { value: 'green', name: 'Green', className: 'bg-green-400' },
    { value: 'blue', name: 'Blue', className: 'bg-blue-400' },
    { value: 'red', name: 'Red', className: 'bg-red-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show subscription expired message if subscription is expired
  if (subscriptionExpired) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400 mb-4">My Tasks</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-600 dark:text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              تریال شما به پایان رسیده است
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-6">
              برای مشاهده و مدیریت تسک‌های خود، لطفاً اشتراک تهیه کنید.
            </p>
            <button
              onClick={() => setShowSubscribe(true)}
              className="px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors font-medium text-lg"
            >
              اشتراک بگیرید
            </button>
          </div>
        </div>
        <SubscriptionModal
          isOpen={showSubscribe}
          onClose={() => setShowSubscribe(false)}
          onSuccess={() => {
            setShowSubscribe(false);
            setSubscriptionExpired(false);
            fetchTasks(1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400 mb-4">My Tasks</h1>
        
        {/* Date Selector */}
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Date
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllTasks}
                onChange={(e) => setShowAllTasks(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show All Tasks</span>
            </label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setShowAllTasks(false);
            }}
            disabled={showAllTasks}
            className={`px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              showAllTasks ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Daily Performance Overview */}
        <div className="bg-emerald-700 dark:bg-emerald-800 rounded-lg p-6 text-white mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {showAllTasks ? 'Overall Performance' : 'Daily Performance'}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm opacity-90">Total Tasks</p>
              <p className="text-3xl font-bold">{totalCount}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Completed</p>
              <p className="text-3xl font-bold">{completedCount}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Completion Rate</p>
              <p className="text-3xl font-bold">{completionRate}%</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

        {/* Add/Edit Task Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h2>
          <form onSubmit={editingTask ? handleUpdateTask : handleAddTask}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date || selectedDate}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Work, Personal"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Label Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {labelOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          label: option.value,
                        })
                      }
                      className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        option.value === 'none'
                          ? option.className
                          : `${option.className} border-transparent`
                      } ${
                        formData.label === option.value
                          ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-800'
                          : 'ring-0'
                      }`}
                      aria-label={option.name}
                      title={option.name}
                    >
                      {option.showIcon && (
                        <span className="text-xs text-gray-500 dark:text-gray-300">×</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Recurring Task Options */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Make this a recurring task
                  </label>
                </div>
                
                {formData.is_recurring && (
                  <div className="space-y-4 pl-6 border-l-2 border-emerald-200 dark:border-emerald-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Repeat Every
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={formData.recurrence_interval}
                            onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                            className="w-20 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="1"
                          />
                          <select
                            value={formData.recurrence_type}
                            onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' })}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="daily">Day(s)</option>
                            <option value="custom">Custom Days</option>
                            <option value="weekly">Week(s)</option>
                            <option value="monthly">Month(s)</option>
                            <option value="yearly">Year(s)</option>
                          </select>
                        </div>
                        {(formData.recurrence_type === 'daily' || formData.recurrence_type === 'custom') && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Task will repeat every {formData.recurrence_interval} day{formData.recurrence_interval !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={formData.recurrence_end_date}
                          onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Leave empty for unlimited recurrence
                        </p>
                      </div>
                    </div>
                    {formData.recurrence_type === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Days of Week
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                const days = formData.recurrence_days || [];
                                const newDays = days.includes(index)
                                  ? days.filter(d => d !== index)
                                  : [...days, index];
                                setFormData({ ...formData, recurrence_days: newDays });
                              }}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                formData.recurrence_days?.includes(index)
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Number of Occurrences (Optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.recurrence_count || ''}
                        onChange={(e) => setFormData({ ...formData, recurrence_count: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Leave empty for unlimited"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors"
                >
                  {editingTask ? 'Update Task' : 'Add Task'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Task Button */}
      {!showAddForm && (
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 font-medium transition-colors"
          >
            + Add New Task
          </button>
          <Link
            href="/templates"
            className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 font-medium transition-colors"
          >
            📋 Use Template
          </Link>
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Search & Filters</h2>
        
        {/* Search Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Tasks
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or category..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Category
            </label>
            <div className="flex flex-wrap gap-2">
              {allCategories.length > 0 ? (
                allCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-emerald-600 dark:bg-emerald-700 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {category}
                  </button>
                ))
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">No categories available</span>
              )}
            </div>
          </div>

          {/* Label Color Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Label Color
            </label>
            <div className="flex flex-wrap gap-2">
              {labelOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleLabel(option.value)}
                  className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedLabels.includes(option.value)
                      ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-800'
                      : ''
                  } ${
                    option.value === 'none'
                      ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 border border-dashed border-gray-400 dark:border-slate-400'
                      : `${option.className} text-white`
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${
                    option.value === 'none' ? 'bg-gray-400 dark:bg-gray-500' : 'bg-white'
                  }`}></span>
                  {option.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || selectedCategories.length > 0 || selectedLabels.length > 0) && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Active Filters Summary */}
        {(searchQuery || selectedCategories.length > 0 || selectedLabels.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </p>
          </div>
        )}
      </div>

      {/* Tasks List by Category */}
      {Object.keys(categorizedTasks).length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {tasks.length === 0
              ? showAllTasks 
                ? 'No tasks found. Add one to get started!'
                : 'No tasks for this date. Add one to get started!'
              : 'No tasks match your search or filters. Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {Object.entries(categorizedTasks).map(([category, categoryTasks]) => (
              <div key={category} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{category}</h3>
                <div className="space-y-3">
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`relative p-4 rounded-lg border ${
                        task.completed
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                      } transition-all`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleComplete(task)}
                          className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {task.label && task.label !== 'none' && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${labelTagClasses[task.label] || ''}`}
                                title={`${task.label} label`}
                              >
                                <span className="h-2 w-2 rounded-full bg-white/80" />
                              </span>
                            )}
                            <h4
                              className={`font-medium ${
                                task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              {task.title}
                            </h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                            <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(task)}
                            className="px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800 text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {pagination && pagination.count > 10 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.count)} of {pagination.count} tasks
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchTasks(pagination.currentPage - 1)}
                  disabled={!pagination.previous}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchTasks(pagination.currentPage + 1)}
                  disabled={!pagination.next}
                  className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <SubscriptionModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        onSuccess={() => {
          setShowSubscribe(false);
          fetchTasks(pagination?.currentPage || 1);
        }}
      />
    </div>
  );
}

