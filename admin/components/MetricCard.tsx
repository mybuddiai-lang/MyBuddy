import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: 'violet' | 'blue' | 'green' | 'amber' | 'red';
  className?: string;
}

const colorMap = {
  violet: 'bg-violet-500/10 text-violet-400',
  blue: 'bg-blue-500/10 text-blue-400',
  green: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  red: 'bg-red-500/10 text-red-400',
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'violet',
  className,
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4',
        className,
      )}
    >
      <div className={clsx('p-2.5 rounded-lg flex-shrink-0', colorMap[color])}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        {trend && (
          <p
            className={clsx('text-xs mt-1.5', trend.positive ? 'text-emerald-400' : 'text-red-400')}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
