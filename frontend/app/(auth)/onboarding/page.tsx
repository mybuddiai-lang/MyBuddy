'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { usersApi } from '@/lib/api/users';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0); // 0 = school details, 1 = goals
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    school: '',
    department: '',
    specialization: '',
    examDate: '',
  });

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Not logged in — send to login
    if (!isAuthenticated) { router.replace('/login'); return; }
    // Profile already complete — send to home
    if (user?.school) { router.replace('/home'); }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !isAuthenticated || user?.school) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const nextStep = () => {
    if (step === 0) {
      if (!form.school.trim()) return toast.error('Please enter your school or university');
      if (!form.department.trim()) return toast.error('Please enter your department or course');
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!form.school.trim()) return toast.error('Please enter your school');
    if (!form.department.trim()) return toast.error('Please enter your department');
    setIsLoading(true);
    try {
      const updated = await usersApi.updateProfile({
        school: form.school.trim(),
        department: form.department.trim(),
        specialization: form.specialization.trim() || undefined,
        examDate: form.examDate || undefined,
      });
      setUser(updated);
      toast.success("You're all set! Welcome to Buddi 🎉");
      router.replace('/home');
    } catch {
      toast.error('Could not save your details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-soft mb-3">
          <span className="text-white text-2xl font-bold">B</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">One last step</h1>
        <p className="text-zinc-500 text-sm mt-1">Tell us a bit about your studies</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[0, 1].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              i < step ? 'bg-brand-500 text-white' :
              i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100' :
              'bg-zinc-200 text-zinc-500'
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i === 0 && <div className={`w-8 h-0.5 ${step > 0 ? 'bg-brand-500' : 'bg-zinc-200'}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-zinc-800">Your school details</h2>
              <input
                type="text" value={form.school} onChange={e => update('school', e.target.value)}
                placeholder="University / School name" className={inputCls}
              />
              <input
                type="text" value={form.department} onChange={e => update('department', e.target.value)}
                placeholder="Department (e.g. Medicine, Law)" className={inputCls}
              />
              <input
                type="text" value={form.specialization} onChange={e => update('specialization', e.target.value)}
                placeholder="Specialization (optional)" className={inputCls}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-zinc-800">Set your goals</h2>
              <div>
                <label className="block text-sm text-zinc-600 mb-1.5">Next major exam date (optional)</label>
                <input
                  type="date" value={form.examDate} onChange={e => update('examDate', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                <p className="text-sm text-brand-700 font-medium">Almost there!</p>
                <p className="text-xs text-brand-600 mt-1">Buddi will personalise your experience based on your goals.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 mt-6">
          {step === 1 && (
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 text-zinc-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 transition"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          {step === 0 ? (
            <button
              onClick={nextStep}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-soft text-sm"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-soft text-sm"
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check size={16} /> Get Started</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
