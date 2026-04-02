'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, BookOpen, Brain, MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  sentimentBaseline: number;
  studyStreak: number;
  totalStudyMinutes: number;
  createdAt: string;
  lastActiveAt: string;
  profile?: {
    university?: string;
    fieldOfStudy?: string;
    examDate?: string;
    yearOfStudy?: number;
  };
  stats: {
    noteCount: number;
    reminderCount: number;
    sessionCount: number;
    messageCount: number;
  };
  recentAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    createdAt: string;
    resolved: boolean;
  }>;
}

const severityColor: Record<string, string> = {
  LOW: 'bg-blue-50 text-blue-700',
  MEDIUM: 'bg-yellow-50 text-yellow-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-red-50 text-red-700',
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ['admin-user', id],
    queryFn: () => apiClient.get(`/admin/users/${id}`).then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton height="32px" width="200px" />
        <Skeleton height="120px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  if (!user) return null;

  const sentimentRisk = user.sentimentBaseline < 0.3
    ? 'HIGH'
    : user.sentimentBaseline < 0.5
    ? 'MEDIUM'
    : 'LOW';

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition"
        >
          <ArrowLeft size={16} className="text-zinc-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{user.name}</h1>
          <p className="text-zinc-400 text-sm">{user.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={user.role === 'ADMIN' ? 'warning' : 'default'}>{user.role}</Badge>
          <Badge variant={user.subscriptionTier === 'PREMIUM' ? 'success' : 'default'}>
            {user.subscriptionTier}
          </Badge>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader title="Profile" />
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">University</p>
              <p className="font-medium text-zinc-900">{user.profile?.university ?? '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Field of Study</p>
              <p className="font-medium text-zinc-900">{user.profile?.fieldOfStudy ?? '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Year of Study</p>
              <p className="font-medium text-zinc-900">{user.profile?.yearOfStudy ?? '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Exam Date</p>
              <p className="font-medium text-zinc-900">
                {user.profile?.examDate ? formatDate(user.profile.examDate) : '—'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Joined</p>
              <p className="font-medium text-zinc-900">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Last Active</p>
              <p className="font-medium text-zinc-900">{formatDate(user.lastActiveAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wellness */}
      <Card>
        <CardHeader title="Wellness & Activity" />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600">Sentiment Baseline</span>
            <Badge
              variant={sentimentRisk === 'HIGH' ? 'danger' : sentimentRisk === 'MEDIUM' ? 'warning' : 'success'}
            >
              {sentimentRisk} RISK
            </Badge>
          </div>
          <Progress
            value={user.sentimentBaseline * 100}
            color={
              user.sentimentBaseline < 0.3
                ? 'bg-red-500'
                : user.sentimentBaseline < 0.5
                ? 'bg-yellow-500'
                : 'bg-emerald-500'
            }
            showValue
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { icon: Brain, label: 'Study Streak', value: `${user.studyStreak} days` },
              { icon: BookOpen, label: 'Notes', value: user.stats.noteCount },
              { icon: MessageCircle, label: 'Messages', value: user.stats.messageCount },
              { icon: Brain, label: 'Recall Sessions', value: user.stats.sessionCount },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 bg-zinc-50 rounded-xl p-3">
                <Icon size={16} className="text-zinc-400" />
                <div>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-sm font-semibold text-zinc-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {user.recentAlerts.length > 0 && (
        <Card>
          <CardHeader title="Recent Alerts" />
          <CardContent className="space-y-2">
            {user.recentAlerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50"
              >
                <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${severityColor[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-zinc-400">{formatDate(alert.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-700 truncate">{alert.message}</p>
                </div>
                {alert.resolved && (
                  <span className="text-xs text-emerald-600 font-medium shrink-0">Resolved</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
