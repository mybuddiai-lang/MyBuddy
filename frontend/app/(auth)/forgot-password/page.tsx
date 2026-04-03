'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter your email address');
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch {
      // Always show success to prevent email enumeration
    }
    setIsLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">Check your inbox</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8">
            If an account exists for <span className="font-medium text-zinc-700">{email}</span>, we've sent a password reset link. Check your spam folder too.
          </p>
          <Link
            href="/login"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-soft text-sm"
          >
            Back to Sign In
          </Link>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Try a different email
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Back link */}
        <div className="w-full max-w-sm mb-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition"
          >
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </div>

        {/* Icon + heading */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
            <Mail size={28} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Forgot your password?</h1>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs leading-relaxed">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@university.edu"
              className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-300 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-700 focus:ring-brand-500'} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent transition text-sm`}
              required
            />
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-soft text-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Send reset link <ArrowRight size={16} /></>
            )}
          </button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-sm text-zinc-500"
        >
          Remember your password?{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">
            Sign in
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
