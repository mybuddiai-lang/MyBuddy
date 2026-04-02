interface EmptyStateProps {
  emoji: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <span className="text-5xl mb-4">{emoji}</span>
      <p className="font-semibold text-zinc-800 text-base">{title}</p>
      {description && <p className="text-zinc-400 text-sm mt-2 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-soft"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
