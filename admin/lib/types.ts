export type UserRole = 'USER' | 'SUPPORT' | 'ANALYST' | 'ADMIN' | 'SUPER_ADMIN';
export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'INSTITUTIONAL';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

export interface DashboardData {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  mrr: string;
  premiumUsers: number;
  alertCount: number;
}

export interface SignupTrendPoint {
  date: string;
  count: number;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  school: string | null;
  department: string | null;
  country: string | null;
  isBlocked: boolean;
  subscriptionTier: SubscriptionTier;
  sentimentBaseline: number;
  studyStreak: number;
  lastActiveAt: string | null;
  createdAt: string;
  _count: { chatMessages: number; notes: number; reminders: number };
}

export interface UserDetail extends UserRow {
  specialization: string | null;
  resilienceScore: number;
  subscription: { planType: string; status: string; expiresAt: string } | null;
  recentActivity: Array<{ eventType: string; createdAt: string; eventData: unknown }>;
}

export interface AdminMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastActiveAt: string | null;
  createdAt: string;
  isBlocked: boolean;
}

export interface MentalHealthStats {
  totalUsers: number;
  distressUsers: number;
  distressPercent: string;
  repeatedDistress: number;
  buckets: { minimal: number; mild: number; moderate: number; severe: number };
}

export interface ReferralStats {
  distressDetected: number;
  referralShown: number;
  referralAccepted: number;
  shownToAcceptedRate: string;
  distressToShownRate: string;
}

export interface MonetizationStats {
  premiumUsers: number;
  freeUsers: number;
  totalUsers: number;
  conversionRate: string;
  mrr: string;
  arpu: string;
  totalRevenue: string;
  recentPayments: PaymentRow[];
}

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  planType: string;
  createdAt: string;
  user: { name: string; email: string };
}

export interface Professional {
  id: string;
  name: string;
  email: string;
  specialty: string;
  location: string | null;
  available: boolean;
  approved: boolean;
  bio: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  eventType: string;
  createdAt: string;
  sessionId: string | null;
  user: { name: string; email: string } | null;
}

export interface AiStats {
  totalTokens: number;
  totalMessages: number;
  estimatedCostUSD: number;
  failureEvents: number;
  failureRate: string;
  dailyUsage: Array<{ date: string; tokens: number; messages: number }>;
}

export interface SystemHealth {
  status: string;
  dbPingMs: number;
  errorEventsLastHour: number;
  uptimeSeconds: number;
  nodeVersion: string;
  timestamp: string;
}
