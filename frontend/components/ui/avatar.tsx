import { clsx } from 'clsx';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={clsx('rounded-full object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <div className={clsx('rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-600', sizes[size], className)}>
      {name ? getInitials(name) : '?'}
    </div>
  );
}
