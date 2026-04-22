import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center mb-6 text-4xl">
        🔍
      </div>
      <h1 className="text-2xl font-bold text-zinc-900">Page not found</h1>
      <p className="text-zinc-500 text-sm mt-2 max-w-xs">
        This page doesn&apos;t exist. You may have followed a broken link.
      </p>
      <Link
        href="/home"
        className="mt-8 inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-600 transition shadow-soft"
      >
        Back to Home
      </Link>
    </div>
  );
}
