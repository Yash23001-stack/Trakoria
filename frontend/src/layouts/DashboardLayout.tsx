import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  toast: string | null;
}

export default function DashboardLayout({ children, toast }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 md:p-8 text-left selection:bg-white selection:text-black relative">
      {toast && (
        <div className="fixed bottom-8 right-8 bg-white text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold z-50 flex items-center gap-2 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <span className="w-2 h-2 bg-black animate-pulse" />
          {toast}
        </div>
      )}
      {children}
    </div>
  );
}
