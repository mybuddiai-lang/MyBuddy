import { BottomNav } from '@/components/layout/bottom-nav';
import { TopHeader } from '@/components/layout/top-header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <TopHeader />
      <main className="flex-1 content-with-nav">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
