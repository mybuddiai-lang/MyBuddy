'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

const steps = ['Account', 'School', 'Goals'];

const inputCls = 'w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition';

export default function SignupPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace('/home');
  }, [isAuthenticated, router]);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    school: '',
    department: '',
    specialization: '',
    examDate: '',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const nextStep = () => {
    if (step === 0 && (!form.name || !form.email || !form.password)) {
      return toast.error('Please fill in all fields');
    }
    if (step < steps.length - 1) setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const data = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        school: form.school || undefined,
        department: form.department || undefined,
        specialization: form.specialization || undefined,
        examDate: form.examDate || undefined,
      });
      login(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome to Buddi! 🎉');
      router.replace('/home');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-soft mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Join Buddi</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Your resilience journey starts here</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-brand-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Create your account</h2>

                {/* Google OAuth */}
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
                  className="w-full flex items-center justify-center gap-3 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                  </svg>
                  Sign up with Google
                </a>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">or</span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>

                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your full name" className={inputCls} />
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email address" className={inputCls} />
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Password (min 8 chars)" className={inputCls} />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Your school details</h2>
                <input type="text" value={form.school} onChange={e => update('school', e.target.value)} placeholder="University / School name" className={inputCls} />
                <input type="text" value={form.department} onChange={e => update('department', e.target.value)} placeholder="Department (e.g. Medicine, Law)" className={inputCls} />
                <input type="text" value={form.specialization} onChange={e => update('specialization', e.target.value)} placeholder="Specialization (optional)" className={inputCls} />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Set your goals</h2>
                <div>
                  <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1.5">Next major exam date (optional)</label>
                  <input type="date" value={form.examDate} onChange={e => update('examDate', e.target.value)} className={inputCls} />
                </div>
                <div className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-4 border border-brand-100 dark:border-brand-800">
                  <p className="text-sm text-brand-700 dark:text-brand-300 font-medium">You're almost there!</p>
                  <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">Buddi will personalise your experience based on your goals.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={nextStep} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-soft text-sm">
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-soft text-sm">
                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> Get Started</>}
              </button>
            )}
          </div>
        </div>

        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
