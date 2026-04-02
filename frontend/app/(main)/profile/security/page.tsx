'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Mail, Shield, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function SecurityPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setChangingPw(true);
    try {
      await apiClient.put('/users/profile', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.delete('/users/account');
      logout();
      router.replace('/signup');
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition">
          <ArrowLeft size={18} className="text-zinc-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Privacy & Security</h1>
          <p className="text-xs text-zinc-400">Manage your account security</p>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card">
        <div className="flex items-center gap-3 mb-1">
          <Mail size={16} className="text-zinc-400" />
          <p className="text-sm text-zinc-600">{user?.email}</p>
        </div>
        <p className="text-xs text-zinc-400 pl-7">Your account email</p>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-brand-500" />
          <p className="text-sm font-semibold text-zinc-800">Change Password</p>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { label: 'Current password', value: currentPassword, setter: setCurrentPassword },
            { label: 'New password', value: newPassword, setter: setNewPassword },
            { label: 'Confirm new password', value: confirmPassword, setter: setConfirmPassword },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={changingPw}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition"
          >
            {changingPw ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* GDPR / Data */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-brand-500" />
          <p className="text-sm font-semibold text-zinc-800">Data & Privacy</p>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Buddi is GDPR and NDPR compliant. Your data is encrypted at rest and in transit. We never sell your data.
          AI conversations are used only to improve your experience.
        </p>
        <button className="mt-3 text-xs text-brand-600 font-medium hover:text-brand-700">
          Download my data →
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={16} className="text-red-500" />
          <p className="text-sm font-semibold text-red-700">Delete Account</p>
        </div>
        <p className="text-xs text-red-600 mb-3">This is permanent and cannot be undone. All your data will be erased.</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 font-medium transition">
            I want to delete my account
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-700">Are you absolutely sure?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition">Cancel</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition">Yes, delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
