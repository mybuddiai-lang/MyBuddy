'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

const steps = ['Account', 'School', 'Goals'];

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [step, setStep] = useState(0);
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
      const data = await authApi.register(form);
      login(data.user, data.accessToken);
      toast.success('Welcome to Buddi! 🎉');
      router.replace('/home');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-soft mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Join Buddi</h1>
          <p className="text-zinc-500 text-sm mt-1">Your resilience journey starts here</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-zinc-200 text-zinc-500'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-500' : 'bg-zinc-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-800">Create your account</h2>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your full name" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email address" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Password (min 8 chars)" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-800">Your school details</h2>
                <input type="text" value={form.school} onChange={e => update('school', e.target.value)} placeholder="University / School name" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
                <input type="text" value={form.department} onChange={e => update('department', e.target.value)} placeholder="Department (e.g. Medicine, Law)" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
                <input type="text" value={form.specialization} onChange={e => update('specialization', e.target.value)} placeholder="Specialization (optional)" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-800">Set your goals</h2>
                <div>
                  <label className="block text-sm text-zinc-600 mb-1.5">Next major exam date (optional)</label>
                  <input type="date" value={form.examDate} onChange={e => update('examDate', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
                </div>
                <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                  <p className="text-sm text-brand-700 font-medium">You're almost there!</p>
                  <p className="text-xs text-brand-600 mt-1">Buddi will personalise your experience based on your goals.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 text-zinc-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 transition">
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

        <p className="mt-8 text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
