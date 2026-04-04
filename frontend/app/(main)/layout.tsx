import { BottomNav } from '@/components/layout/bottom-nav';
import { TopHeader } from '@/components/layout/top-header';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PwaInstallBanner } from '@/components/pwa-install-banner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <PwaInstallBanner />
        <TopHeader />
        <main className="flex-1 content-with-nav">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
