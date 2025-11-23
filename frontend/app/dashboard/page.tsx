'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '../lib/config';
import { authenticatedFetch } from '../lib/api';
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
  trial_days_remaining?: number;
  subscription_plan?: string;
  subscription_status?: string;
  overdue_tasks?: Array<{
    id: number;
    title: string;
    due_date: string;
  }>;
  // Allow extra keys from backend
  [key: string]: unknown;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/dashboard/?period=${selectedPeriod}`
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
  }, [selectedPeriod, router]);

  const fetchRecentTasks = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/recent/`);

      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        if (data.results) {
          setRecentTasks(data.results);
        } else {
          // Fallback for non-paginated response
          setRecentTasks(data);
        }
      }
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentTasks();
  }, [fetchDashboardData, fetchRecentTasks]);

  const handleDeleteOverdueTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/${taskId}/`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDashboardData();
        fetchRecentTasks();
      }
    } catch (error) {
      console.error('Error deleting overdue task:', error);
    }
  };

  const handleRescheduleOverdueTask = async (taskId: number, taskTitle: string) => {
    const confirmed = confirm(
      `You still haven't completed "${taskTitle}". Do you want to move it to tomorrow?`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE}/api/tasks/${taskId}/reschedule/`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchDashboardData();
        fetchRecentTasks();
      }
    } catch (error) {
      console.error('Error rescheduling overdue task:', error);
      alert('Failed to reschedule task. Please try again.');
    }
  };

  const generatePDF = async () => {
    if (!stats || generatingPDF) return;

    setGeneratingPDF(true);
    try {
      // Dynamic import for client-side only
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF() as jsPDF & { internal: { getNumberOfPages: () => number } };
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper function to add a new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('Task Manager Dashboard Report', margin, yPosition);
    yPosition += 10;

    // Period information
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const periodText = selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month';
    doc.text(`Period: ${periodText}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPosition);
    yPosition += sectionSpacing;

    // Stats Section
    checkNewPage(30);
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text('Statistics Overview', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const statsData = [
      ['Metric', 'Value'],
      ['Total Tasks', stats.total_tasks.toString()],
      ['Completed Tasks', stats.completed_tasks.toString()],
      ['Pending Tasks', stats.pending_tasks.toString()],
      ['Completion Rate', `${stats.completion_rate}%`],
    ];

    // Simple table for stats
    statsData.forEach((row, index) => {
      if (index === 0) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(75, 85, 99); // gray-600
      } else {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
      }
      doc.text(row[0], margin, yPosition);
      doc.text(row[1], pageWidth - margin - 40, yPosition, { align: 'right' });
      yPosition += lineHeight;
    });

    yPosition += sectionSpacing;

    // Tasks by Category
    if (Object.keys(stats.tasks_by_category).length > 0) {
      checkNewPage(40);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Tasks by Category', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('Category', margin, yPosition);
      doc.text('Count', pageWidth - margin - 40, yPosition, { align: 'right' });
      yPosition += lineHeight;
      doc.setFont(undefined, 'normal');

      Object.entries(stats.tasks_by_category).forEach(([category, count]) => {
        checkNewPage(lineHeight);
        doc.text(category || 'Uncategorized', margin + 5, yPosition);
        doc.text(count.toString(), pageWidth - margin - 40, yPosition, { align: 'right' });
        yPosition += lineHeight;
      });
      yPosition += sectionSpacing;
    }

    // Tasks by Date
    if (stats.tasks_by_date.length > 0) {
      checkNewPage(40);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Tasks by Date', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('Date', margin, yPosition);
      doc.text('Completed/Total', pageWidth - margin - 40, yPosition, { align: 'right' });
      yPosition += lineHeight;
      doc.setFont(undefined, 'normal');

      stats.tasks_by_date.slice(0, 15).forEach((item) => {
        checkNewPage(lineHeight);
        const dateStr = new Date(item.date).toLocaleDateString();
        doc.text(dateStr, margin + 5, yPosition);
        doc.text(`${item.completed}/${item.total}`, pageWidth - margin - 40, yPosition, { align: 'right' });
        yPosition += lineHeight;
      });
      if (stats.tasks_by_date.length > 15) {
        yPosition += 3;
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text(`... and ${stats.tasks_by_date.length - 15} more dates`, margin + 5, yPosition);
        yPosition += lineHeight;
      }
      yPosition += sectionSpacing;
    }

    // Recent Tasks
    if (recentTasks.length > 0) {
      checkNewPage(40);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recent Tasks', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      recentTasks.slice(0, 10).forEach((task) => {
        checkNewPage(lineHeight * 2);
        doc.setFont(undefined, task.completed ? 'normal' : 'bold');
        doc.setTextColor(task.completed ? 107 : 0, task.completed ? 114 : 0, task.completed ? 128 : 0);
        const taskTitle = task.completed ? `✓ ${task.title}` : task.title;
        doc.text(taskTitle, margin + 5, yPosition, { maxWidth: pageWidth - margin * 2 - 50 });
        yPosition += lineHeight;
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const taskInfo = `Due: ${new Date(task.due_date).toLocaleDateString()}${task.category ? ` | Category: ${task.category}` : ''}`;
        doc.text(taskInfo, margin + 10, yPosition);
        yPosition += lineHeight + 2;
        doc.setFontSize(11);
      });
    }

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Generate filename
    const periodName = selectedPeriod === 'today' ? 'today' : selectedPeriod === 'week' ? 'week' : 'month';
    const filename = `dashboard-report-${periodName}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Save PDF
    doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
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
      {stats?.overdue_tasks && stats.overdue_tasks.length > 0 && (
        <div className="mb-6 space-y-3">
          {stats.overdue_tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-semibold">
                  You still have not completed “{task.title}”
                </p>
                <p className="text-xs opacity-80">
                  Original due date: {new Date(task.due_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleDeleteOverdueTask(task.id)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-400 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-800/40 transition-colors"
                >
                  Delete task
                </button>
                <button
                  onClick={() => handleRescheduleOverdueTask(task.id, task.title)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Move to tomorrow
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {stats && (
        <div className="mb-4">
          {/* @ts-expect-error - allow extra keys from backend */}
          {stats.subscription_plan === 'trial' && stats.subscription_status === 'active' && (stats.trial_days_remaining ?? 0) > 0 ? (
            <div className="rounded-lg p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center justify-between">
                <span>
                  Free trial days remaining: <strong className="text-lg">{stats.trial_days_remaining}</strong> days
                </span>
              </div>
            </div>
          ) : stats.subscription_plan === 'trial' && (stats.subscription_status === 'expired' || (stats.trial_days_remaining ?? 0) === 0) ? (
            <div className="rounded-lg p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between">
              <span className="font-medium">Your trial has ended. Please subscribe to continue using the service.</span>
              <button
                onClick={() => setShowSubscribe(true)}
                className="px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap"
              >
                Subscribe Now
              </button>
            </div>
          ) : stats.subscription_plan !== 'trial' && stats.subscription_status === 'active' ? (
            <div className="rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
              <span>Active subscription: <strong>{stats.subscription_plan === 'monthly' ? 'Monthly ($20)' : 'Yearly ($200)'}</strong></span>
            </div>
          ) : null}
        </div>
      )}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">Dashboard</h1>
          <button
            onClick={generatePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPDF ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </>
            )}
          </button>
        </div>
        
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

