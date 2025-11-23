'use client';

import { useState } from 'react';

export default function AboutPage() {
  const [isAuthed] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('access_token');
    }
    return false;
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4">About Task Manager</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
            Task Manager is a modern, intuitive task management application designed to help you
            stay organized and productive. Built with cutting-edge technologies, it provides a
            seamless experience for managing your daily tasks and tracking your progress.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Our mission is to help individuals and teams achieve their goals by providing a simple,
            yet powerful tool for task management. We believe that staying organized is the first
            step towards success, and our platform makes it easier than ever.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
            <li>Create, edit, and delete tasks with ease</li>
            <li>Organize tasks by categories and dates</li>
            <li>Track your daily performance and completion rates</li>
            <li>View comprehensive dashboards with analytics</li>
            <li>Manage your profile with custom settings</li>
            <li>Secure authentication and data protection</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Frontend</h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Next.js 16 - React Framework</li>
                <li>• TypeScript - Type Safety</li>
                <li>• Tailwind CSS - Styling</li>
                <li>• React 19 - UI Library</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Backend</h3>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Django 5.2 - Python Framework</li>
                <li>• Django REST Framework - API</li>
                <li>• JWT Authentication - Security</li>
                <li>• POSTGRESQL - Database</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-4xl mb-2">🚀</div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast & Reliable</h3>
              <p className="text-sm text-gray-600">
                Built with performance in mind, ensuring quick load times and smooth operation.
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-4xl mb-2">🔒</div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure</h3>
              <p className="text-sm text-gray-600">
                Your data is protected with industry-standard security practices.
              </p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-4xl mb-2">✨</div>
              <h3 className="font-semibold text-gray-900 mb-2">User-Friendly</h3>
              <p className="text-sm text-gray-600">
                Intuitive interface designed for users of all technical levels.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Get Started</h2>
          <p className="text-gray-600 mb-4">
            Ready to boost your productivity? Sign up today and start managing your tasks more
            effectively!
          </p>
          {!isAuthed && (
            <div className="flex gap-4">
              <a
                href="/signup"
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium inline-block"
              >
                Sign Up Now
              </a>
              <a
                href="/contact"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium inline-block"
              >
                Contact Us
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

