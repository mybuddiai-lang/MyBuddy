'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, CreditCard, Shield, ChevronRight, Flame, Brain, Target, Star, Pencil, X, Check, Trophy, LayoutDashboard } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { usersApi } from '@/lib/api/users';
import toast from 'react-hot-toast';

interface EditForm {
  name: string;
  school: string;
  department: string;
  specialization: string;
  examDate: string;
}

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: user?.name || '',
    school: user?.school || '',
    department: user?.department || '',
    specialization: user?.specialization || '',
    examDate: user?.examDate ? new Date(user.examDate).toISOString().slice(0, 10) : '',
  });

  const daysUntilExam = user?.examDate
    ? differenceInDays(new Date(user.examDate), new Date())
    : null;

  const { examBannerHidden, setExamBannerHidden } = useUIStore();
  const dismissExamBanner = () => setExamBannerHidden(true);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await usersApi.updateProfile({
        name: form.name || undefined,
        school: form.school || undefined,
        department: form.department || undefined,
        specialization: form.specialization || undefined,
        examDate: form.examDate || undefined,
      });
      setUser({
        ...user,
        name: form.name || user.name,
        school: form.school || user.school,
        department: form.department || user.department,
        specialization: form.specialization || user.specialization,
        examDate: form.examDate || user.examDate,
      });
      toast.success('Profile updated');
      setShowEdit(false);
    } catch {
      toast.error('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.email === 'admin@gmail.com' || user?.role === 'ADMIN';

  const SETTINGS = [
    ...(isAdmin ? [{ icon: LayoutDashboard, label: 'Admin Dashboard', desc: 'Platform analytics and controls', href: '/admin' }] : []),
    { icon: Trophy, label: 'Leaderboard', desc: 'See how you rank', href: '/leaderboard' },
    { icon: Bell, label: 'Notifications', desc: 'Reminders and alerts', href: '/profile/notifications' },
    { icon: CreditCard, label: 'Subscription', desc: user?.subscriptionTier === 'FREE' ? 'Free tier — Upgrade' : 'Premium', href: '/profile/subscription' },
    { icon: Shield, label: 'Privacy & Security', desc: 'Data and account', href: '/profile/security' },
  ];

  return (
    <div className="px-4 py-4 space-y-5 pb-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-card"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">{user?.name || 'Student'}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{user?.school || 'University'}</p>
            <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              user?.subscriptionTier === 'PREMIUM' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' :
              user?.subscriptionTier === 'INSTITUTIONAL' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400' :
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}>
              {user?.subscriptionTier || 'FREE'}
            </span>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center shrink-0 transition"
          >
            <Pencil size={15} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Exam countdown */}
        {daysUntilExam !== null && daysUntilExam > 0 && !examBannerHidden && (
          <div className="mt-4 bg-brand-50 dark:bg-brand-900/30 rounded-xl p-3 flex items-center gap-3">
            <Target size={18} className="text-brand-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{daysUntilExam} days until exam</p>
              <p className="text-xs text-brand-500 dark:text-brand-400">Keep going — you've got this!</p>
            </div>
            <button
              onClick={dismissExamBanner}
              className="text-brand-300 hover:text-brand-500 dark:text-brand-600 dark:hover:text-brand-400 transition shrink-0"
              title="Hide exam countdown"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, value: user?.studyStreak ?? 0, label: 'Day streak', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/50' },
          { icon: Brain, value: Math.round(user?.resilienceScore ?? 50), label: 'Resilience', color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/30' },
          { icon: Star, value: user?.studyStreak ? `${Math.min(100, user.studyStreak * 5)}%` : '0%', label: 'Mastery avg', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
        ].map(({ icon: Icon, value, label, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className={`${bg} rounded-2xl p-4 text-center`}
          >
            <Icon size={20} className={`${color} mx-auto mb-1`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-card divide-y divide-zinc-50 dark:divide-zinc-800">
        {SETTINGS.map(({ icon: Icon, label, desc, href }) => (
          <button key={label} onClick={() => router.push(href)} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-left">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Icon size={16} className="text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{label}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-950 transition"
      >
        <LogOut size={16} /> Sign Out
      </button>

      <p className="text-center text-xs text-zinc-300 dark:text-zinc-600">Buddi v2.0 · Student Resilience Infrastructure</p>

      {/* Edit profile modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-zinc-100 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Edit Profile</h2>
              <button onClick={() => setShowEdit(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                <X size={16} className="text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name' },
                { label: 'School / University', key: 'school', type: 'text', placeholder: 'e.g. University of Lagos' },
                { label: 'Department', key: 'department', type: 'text', placeholder: 'e.g. Medicine & Surgery' },
                { label: 'Specialization', key: 'specialization', type: 'text', placeholder: 'e.g. Cardiology, Law, Engineering' },
                { label: 'Exam Date', key: 'examDate', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof EditForm]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Check size={16} /> Save Changes</>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
