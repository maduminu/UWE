import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToastMessage } from '../types/admin.types';

interface AdminToastContainerProps {
  toasts: ToastMessage[];
}

export const AdminToastContainer: React.FC<AdminToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed top-5 right-5 z-[9999999] pointer-events-none space-y-2.5 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            className={`pointer-events-auto px-4 py-3.5 rounded-xl text-xs font-mono-data font-bold shadow-[0_10px_35px_rgba(0,0,0,0.85)] border backdrop-blur-2xl flex items-center gap-2.5 ${
              t.type === 'success'
                ? 'bg-[#0E1E17]/95 text-[#2ED573] border-[#2ED573]/60 shadow-[0_0_20px_rgba(46,213,115,0.25)]'
                : t.type === 'error'
                ? 'bg-[#200E12]/95 text-red-400 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                : 'bg-[#1D1808]/95 text-secondary border-secondary/60 shadow-[0_0_20px_rgba(255,184,0,0.25)]'
            }`}
          >
            <span className="material-symbols-outlined text-base shrink-0">
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            <span className="flex-1 leading-snug">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
