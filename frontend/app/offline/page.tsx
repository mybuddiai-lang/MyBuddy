'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6 text-4xl">
        📡
      </div>
      <h1 className="text-2xl font-bold text-zinc-900">You&apos;re offline</h1>
      <p className="text-zinc-500 text-sm mt-2 max-w-xs">
        No internet connection. Some features are available offline — your recent notes and chats are cached.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-600 transition shadow-soft"
      >
        Try again
      </button>
    </div>
  );
}
