import { clsx } from 'clsx';

interface ProgressProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  color?: string;
  className?: string;
}

export function Progress({ value, label, showValue, color = 'bg-brand-500', className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('space-y-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-zinc-600">{label}</span>}
          {showValue && <span className="text-xs font-semibold text-zinc-700">{clamped}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
