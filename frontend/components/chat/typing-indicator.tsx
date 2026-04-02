export function TypingIndicator() {
  return (
    <div className="bg-white border border-zinc-100 shadow-card px-4 py-3 rounded-2xl rounded-bl-sm inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="typing-dot w-2 h-2 rounded-full bg-zinc-400"
        />
      ))}
    </div>
  );
}
