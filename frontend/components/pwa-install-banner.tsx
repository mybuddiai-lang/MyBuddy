'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/use-install-prompt';

export function PwaInstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-3 pb-2 bg-white border-b border-zinc-200 shadow-md flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
            <span className="text-white text-lg font-bold leading-none">B</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 leading-tight">Install Buddi</p>
            <p className="text-xs text-zinc-500 truncate">Add to your home screen for the best experience</p>
          </div>
          <button
            onClick={install}
            className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
          >
            <Download size={12} />
            Install
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
