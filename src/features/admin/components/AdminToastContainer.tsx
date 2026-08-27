import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToastMessage } from '../types/admin.types';

interface AdminToastContainerProps {
  toasts: ToastMessage[];
}

export const AdminToastContainer: React.FC<AdminToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-[99999] space-y-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className={`px-4 py-3 rounded-xl text-xs font-mono-data font-bold shadow-2xl border backdrop-blur-xl ${
              t.type === 'success'
                ? 'bg-[#2ED573]/15 text-[#2ED573] border-[#2ED573]/50'
                : t.type === 'error'
                ? 'bg-red-500/15 text-red-400 border-red-500/50'
                : 'bg-secondary/15 text-secondary border-secondary/50'
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
