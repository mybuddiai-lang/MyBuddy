'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import toast from 'react-hot-toast';

function GoogleCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userParam = params.get('user');

    if (!accessToken || !userParam) {
      toast.error('Google sign-in failed. Please try again.');
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      login(user, accessToken, refreshToken ?? undefined);
      // If Google user hasn't filled in school/department yet, send to onboarding
      if (!user.school) {
        router.replace('/onboarding');
      } else {
        toast.success(`Welcome back, ${user.name?.split(' ')[0] || 'there'}! 🎉`);
        router.replace('/home');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
      router.replace('/login');
    }
  }, [params, login, router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Signing you in with Google…</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GoogleCallbackInner />
    </Suspense>
  );
}
