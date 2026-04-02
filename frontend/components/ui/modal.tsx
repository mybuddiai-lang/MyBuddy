'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          {/* Content */}
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`relative w-full ${sizes[size]} bg-white rounded-3xl shadow-2xl overflow-hidden`}
          >
            {title && (
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
                <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition">
                  <X size={14} className="text-zinc-600" />
                </button>
              </div>
            )}
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function BottomSheet({ open, onClose, title, children }: Omit<ModalProps, 'size'>) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-200 rounded-full" />
            </div>
            {title && (
              <div className="px-5 pt-2 pb-4 border-b border-zinc-100">
                <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
              </div>
            )}
            <div className="px-5 py-4 safe-area-bottom">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
