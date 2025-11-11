'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionModal from '../components/SubscriptionModal';
import { API_BASE } from '../lib/config';

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  due_date: string;
  category?: string;
  created_at: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    category: '',
  });
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/tasks/?due_date=${selectedDate}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 403) {
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/tasks/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          due_date: formData.due_date || selectedDate,
        }),
      });

      if (response.ok) {
        fetchTasks();
        setFormData({ title: '', description: '', due_date: '', category: '' });
        setShowAddForm(false);
      } else if (response.status === 403) {
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
      const response = await fetch(`${API_BASE}/api/tasks/${editingTask.id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchTasks();
        setEditingTask(null);
        setFormData({ title: '', description: '', due_date: '', category: '' });
      } else if (response.status === 403) {
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
      const response = await fetch(`${API_BASE}/api/tasks/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchTasks();
      } else if (response.status === 403) {
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const response = await fetch(`${API_BASE}/api/tasks/${task.id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (response.ok) {
        fetchTasks();
      } else if (response.status === 403) {
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
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', due_date: '', category: '' });
    setShowAddForm(false);
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

  const categorizedTasks = getTasksByCategory();
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">My Tasks</h1>
        
        {/* Date Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Daily Performance Overview */}
        <div className="bg-emerald-700 dark:bg-emerald-800 rounded-lg p-6 text-white mb-6">
          <h2 className="text-xl font-semibold mb-4">Daily Performance</h2>
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
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-6 px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 font-medium transition-colors"
        >
          + Add New Task
        </button>
      )}

      {/* Tasks List by Category */}
      {Object.keys(categorizedTasks).length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No tasks for this date. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(categorizedTasks).map(([category, categoryTasks]) => (
            <div key={category} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{category}</h3>
              <div className="space-y-3">
                {categoryTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border ${
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
      )}
      <SubscriptionModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        onSuccess={() => {
          setShowSubscribe(false);
          fetchTasks();
        }}
      />
    </div>
  );
}

