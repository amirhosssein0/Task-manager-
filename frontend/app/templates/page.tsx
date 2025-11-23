'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SubscriptionModal from '../components/SubscriptionModal';
import { API_BASE } from '../lib/config';
import { authenticatedFetch } from '../lib/api';

interface TemplateItem {
  id?: number;
  title: string;
  description?: string;
  category?: string;
  label?: 'none' | 'yellow' | 'green' | 'blue' | 'red';
  due_date_offset?: number;
  order?: number;
}

interface TaskTemplate {
  id: number;
  name: string;
  description?: string;
  category?: string;
  items: TemplateItem[];
  created_at: string;
  updated_at: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    items: [] as TemplateItem[],
  });
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/templates/`);

      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : data.results || []);
        setSubscriptionExpired(false);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setTemplates([]);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate
        ? `${API_BASE}/api/tasks/templates/${editingTemplate.id}/`
        : `${API_BASE}/api/tasks/templates/`;
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          items: formData.items.map((item, index) => ({
            title: item.title,
            description: item.description || '',
            category: item.category || '',
            label: item.label || 'none',
            due_date_offset: item.due_date_offset || 0,
            order: index,
          })),
        }),
      });

      if (response.ok) {
        fetchTemplates();
        resetForm();
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/templates/${id}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleUseTemplate = async (template: TaskTemplate) => {
    try {
      const baseDate = new Date().toISOString().split('T')[0];
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/from-template/`, {
        method: 'POST',
        body: JSON.stringify({
          template_id: template.id,
          base_date: baseDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const createdTasks = data.tasks || [];
        const taskCount = createdTasks.length || template.items.length;
        
        alert(`Created ${taskCount} task${taskCount !== 1 ? 's' : ''} from template!`);
        // Navigate to tasks page - show tasks for the earliest date
        // If tasks have different dates, show the earliest one
        let targetDate = baseDate;
        if (createdTasks.length > 0) {
          const dates = createdTasks.map((t: { due_date?: string }) => t.due_date?.split('T')[0]).filter(Boolean);
          if (dates.length > 0) {
            targetDate = dates.sort()[0]; // Earliest date
          }
        }
        router.push(`/tasks?date=${targetDate}`);
      } else if (response.status === 403) {
        setSubscriptionExpired(true);
        setShowSubscribe(true);
      }
    } catch (error) {
      console.error('Error using template:', error);
      alert('Failed to create tasks from template');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: '', items: [] });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { title: '', description: '', category: '', label: 'none', due_date_offset: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const startEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      items: template.items || [],
    });
    setShowForm(true);
  };

  const labelOptions: Array<{
    value: 'none' | 'yellow' | 'green' | 'blue' | 'red';
    name: string;
    className: string;
  }> = [
    { value: 'none', name: 'No Label', className: 'bg-transparent border-dashed border-gray-400' },
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

  if (subscriptionExpired) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Task Templates</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300 mb-6">
            Subscription required to use templates.
          </p>
          <button
            onClick={() => setShowSubscribe(true)}
            className="px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors font-medium"
          >
            Subscribe Now
          </button>
        </div>
        <SubscriptionModal
          isOpen={showSubscribe}
          onClose={() => setShowSubscribe(false)}
          onSuccess={() => {
            setShowSubscribe(false);
            setSubscriptionExpired(false);
            fetchTemplates();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">Task Templates</h1>
        <Link
          href="/tasks"
          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium"
        >
          ← Back to Tasks
        </Link>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-6 py-3 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 font-medium transition-colors"
        >
          + Create New Template
        </button>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Morning Skin Care Routine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Personal, Work"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    + Add Item
                  </button>
                </div>
                {formData.items.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    No items yet. Click &quot;Add Item&quot; to add tasks to this template.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Item {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            required
                            value={item.title}
                            onChange={(e) => updateItem(index, 'title', e.target.value)}
                            placeholder="Task title"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                          />
                          <textarea
                            value={item.description || ''}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={item.category || ''}
                              onChange={(e) => updateItem(index, 'category', e.target.value)}
                              placeholder="Category"
                              className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              value={item.due_date_offset || 0}
                              onChange={(e) => updateItem(index, 'due_date_offset', parseInt(e.target.value) || 0)}
                              placeholder="Days offset"
                              className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm"
                            />
                            <div className="flex gap-1">
                              {labelOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateItem(index, 'label', opt.value)}
                                  className={`w-6 h-6 rounded-full border-2 ${
                                    item.label === opt.value ? 'ring-2 ring-emerald-500' : ''
                                  } ${opt.className}`}
                                  title={opt.name}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
            )}
            {template.category && (
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded mb-2">
                {template.category}
              </span>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {template.items.length} task{template.items.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleUseTemplate(template)}
                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium"
              >
                Use Template
              </button>
              <button
                onClick={() => startEdit(template)}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No templates yet. Create one to get started!</p>
        </div>
      )}

      <SubscriptionModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        onSuccess={() => {
          setShowSubscribe(false);
          fetchTemplates();
        }}
      />
    </div>
  );
}

