'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Zap, Star, Crown } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Star,
    color: 'border-zinc-200',
    features: ['5 slide uploads/month', '50 chat messages/day', 'Basic recall', '1 community pod'],
    cta: 'Current plan',
    disabled: true,
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    price: '$9.99',
    period: 'per month',
    icon: Zap,
    color: 'border-brand-400',
    popular: true,
    features: [
      'Unlimited slide uploads',
      'Unlimited AI chat',
      'Advanced spaced repetition',
      'Voice note summaries',
      'AI memory vault',
      'Unlimited community pods',
      'Exam recovery mode',
      'Priority support',
    ],
    cta: 'Upgrade to Premium',
    disabled: false,
  },
  {
    id: 'premium_annual',
    name: 'Premium Annual',
    price: '$79.99',
    period: 'per year · save 33%',
    icon: Crown,
    color: 'border-amber-400',
    features: [
      'Everything in Premium',
      'Resilience score tracking',
      'Consultant-level recall mode',
      'Study streak rewards',
      'Class leaderboard access',
      'Early access to new features',
    ],
    cta: 'Get Annual Plan',
    disabled: false,
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      // Try Paystack first for Nigerian users, Stripe for others
      const usePaystack = navigator.language.startsWith('en-NG') || Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Lagos');

      if (usePaystack) {
        const res = await apiClient.post('/payments/paystack/initialize', { planType: planId });
        window.location.href = res.data.data.authorizationUrl;
      } else {
        const res = await apiClient.post('/payments/stripe/create-session', { planType: planId });
        window.location.href = res.data.data.checkoutUrl;
      }
    } catch {
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const isPremium = user?.subscriptionTier !== 'FREE';

  return (
    <div className="px-4 py-4 pb-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition">
          <ArrowLeft size={18} className="text-zinc-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Subscription</h1>
          <p className="text-xs text-zinc-400">Unlock your full potential</p>
        </div>
      </div>

      {isPremium && (
        <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-brand-600" />
            <p className="text-sm font-semibold text-brand-700">You're on {user?.subscriptionTier}</p>
          </div>
          <p className="text-xs text-brand-600 mt-1">All premium features are unlocked. 🎉</p>
        </div>
      )}

      <div className="space-y-4">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrentPlan = (plan.id === 'free' && user?.subscriptionTier === 'FREE') ||
            (plan.id !== 'free' && user?.subscriptionTier === 'PREMIUM');
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-white rounded-2xl p-5 border-2 shadow-card ${plan.popular ? 'border-brand-400' : plan.color} relative`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.popular ? 'bg-brand-100' : 'bg-zinc-100'}`}>
                    <Icon size={18} className={plan.popular ? 'text-brand-600' : 'text-zinc-600'} />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900">{plan.name}</p>
                    <p className="text-xs text-zinc-400">{plan.period}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-zinc-900">{plan.price}</p>
                </div>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !plan.disabled && !isCurrentPlan && handleUpgrade(plan.id)}
                disabled={plan.disabled || isCurrentPlan || !!loading}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                  isCurrentPlan ? 'bg-zinc-100 text-zinc-400 cursor-default' :
                  plan.disabled ? 'bg-zinc-100 text-zinc-400 cursor-default' :
                  plan.popular ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-soft' :
                  'border border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                {loading === plan.id ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto" /> :
                  isCurrentPlan ? 'Current plan' : plan.cta}
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-zinc-400 pb-4">
        Payments are processed securely via Stripe and Paystack. Cancel anytime.
      </p>
    </div>
  );
}
