import { clsx } from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  rounded?: string;
}

export function Skeleton({ width, height, rounded = 'rounded-xl', className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx('animate-pulse bg-zinc-100', rounded, className)}
      style={{ width, height }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-100 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton height="14px" width="60%" />
          <Skeleton height="12px" width="40%" />
        </div>
      </div>
      <Skeleton height="12px" />
      <Skeleton height="12px" width="80%" />
    </div>
  );
}

export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Skeleton width="32px" height="32px" rounded="rounded-full" />}
      <Skeleton width={isUser ? '55%' : '65%'} height="48px" rounded="rounded-2xl" />
    </div>
  );
}
