'use client';

import { useState } from 'react';
import { API_BASE } from '../lib/config';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, onSuccess }: SubscriptionModalProps) {
  const [step, setStep] = useState<'plan' | 'payment' | 'processing' | 'success'>('plan');
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    name: '',
  });

  if (!isOpen) return null;

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    } as Record<string, string>;
  };

  const handlePayment = async () => {
    setStep('processing');
    try {
      const res = await fetch(`${API_BASE}/api/billing/subscribe/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plan,
          card_number: paymentData.cardNumber.replace(/\s+/g, ''),
          expiry: paymentData.expiryDate,
          cvc: paymentData.cvv,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Payment failed');
      }
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep('plan');
      }, 1500);
    } catch (e) {
      setStep('plan');
      alert((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6 border border-gray-200 dark:border-slate-700">
        {step === 'plan' && (
          <>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Choose Your Plan
            </h2>
            <div className="space-y-3 mb-6">
              <label className={`block cursor-pointer border rounded-lg p-4 ${plan === 'monthly' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-slate-600'}`}>
                <input type="radio" name="plan" className="mr-2" checked={plan === 'monthly'} onChange={() => setPlan('monthly')} />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Monthly</span>
                <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-bold">$20</span>
              </label>
              <label className={`block cursor-pointer border rounded-lg p-4 ${plan === 'yearly' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-slate-600'}`}>
                <input type="radio" name="plan" className="mr-2" checked={plan === 'yearly'} onChange={() => setPlan('yearly')} />
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Yearly</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 dark:text-red-400 font-bold line-through">$240</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">$200</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">Save $40</span>
                  </div>
                </div>
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">New users start with a 14-day free trial.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('payment')}
                className="flex-1 px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Payment Information
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 1234 5678"
                  value={paymentData.cardNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                    setPaymentData({ ...paymentData, cardNumber: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={paymentData.expiryDate}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      let formatted = digits;
                      if (digits.length >= 3) {
                        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                      }
                      setPaymentData({ ...paymentData, expiryDate: formatted });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={paymentData.cvv}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        cvv: e.target.value.replace(/\D/g, '').slice(0, 3),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={paymentData.name}
                  onChange={(e) => setPaymentData({ ...paymentData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('plan')}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-colors"
              >
                Pay {plan === 'monthly' ? '$20' : '$200'}
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Processing payment...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Payment Successful!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your subscription is active. Enjoy premium features!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

