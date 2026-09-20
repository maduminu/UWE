import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useRealtimeEvent } from '../../services/realtime';
import { authService } from '../../services/auth';
import { safeGetStorage } from '../../utils/storage';

export interface NotificationItem {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  type?: string | null;
  createdAt: string;
}

interface NotificationBellProps {
  onNavigate?: (pathOrPage: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const getCallerUserId = useCallback(() => {
    const studentUser = authService.getStudentUser() || safeGetStorage<any>('uwe_user_account', null);
    return studentUser?.id || undefined;
  }, []);

  // ── Fetch Notifications from Backend ──
  const fetchNotifications = useCallback(async () => {
    try {
      const userId = getCallerUserId();
      const res = await api.getNotifications(userId);
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
        setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : 0);
      }
    } catch {
      // Offline fallback
    }
  }, [getCallerUserId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Realtime SSE Subscriptions ──
  useRealtimeEvent('notification:new', (detail: any) => {
    const callerId = getCallerUserId();
    const targetUserId = detail?.targetUserId ?? detail?.notification?.userId;

    // Check if notification is for everyone (null) or matches current user
    if (!targetUserId || targetUserId === callerId) {
      if (detail?.notification) {
        setNotifications((prev) => [detail.notification, ...prev.filter((n) => n.id !== detail.notification.id)]);
      }
      setUnreadCount((prev) => prev + 1);
    }
  });

  useRealtimeEvent('notification:read', (detail: any) => {
    if (detail?.all) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } else if (detail?.id) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === detail.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  });

  // ── Close on click outside ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── Mark Single Item Read ──
  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await api.markNotificationRead(notif.id);
      } catch { /* silent */ }
    }

    setIsOpen(false);

    if (notif.link) {
      if (onNavigate) {
        onNavigate(notif.link);
      } else if (typeof window !== 'undefined') {
        window.location.href = notif.link;
      }
    }
  };

  // ── Mark All as Read ──
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      const userId = getCallerUserId();
      await api.markAllNotificationsRead(userId);
    } catch { /* silent */ }
  };

  // Icon selector by notification type
  const getTypeIcon = (type?: string | null) => {
    switch (type) {
      case 'MASTERMIND_ANSWER':
        return { icon: 'forum', color: 'text-[#FFB800]', bg: 'bg-[#FFB800]/15' };
      case 'REVIEW_APPROVED':
        return { icon: 'verified', color: 'text-[#00FF66]', bg: 'bg-[#00FF66]/15' };
      case 'COHORT_SESSION':
        return { icon: 'calendar_month', color: 'text-[#00D2FF]', bg: 'bg-[#00D2FF]/15' };
      default:
        return { icon: 'notifications_active', color: 'text-secondary', bg: 'bg-secondary/15' };
    }
  };

  // Time formatting helper
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {/* Trigger Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Open notifications"
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-secondary/20 text-secondary border border-secondary shadow-[0_0_15px_rgba(255,184,0,0.3)]'
            : 'bg-[#0D121F] hover:bg-secondary/10 text-on-surface-variant hover:text-secondary border border-outline-variant/30 hover:border-secondary/40'
        }`}
      >
        <span className="material-symbols-outlined text-xl">notifications</span>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-secondary text-black font-mono-data text-[10px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(255,184,0,0.8)] border border-black"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-[330px] sm:w-[380px] rounded-2xl bg-[#090D18]/95 backdrop-blur-2xl border border-secondary/40 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(255,184,0,0.15)] z-[9999] overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-outline-variant/20 flex items-center justify-between bg-[#0C1222]/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">radar</span>
                <span className="font-mono-data text-xs font-bold text-on-surface uppercase tracking-wider">
                  Intel Feed
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-secondary/20 border border-secondary/40 text-secondary text-[10px] font-mono-data font-bold">
                    {unreadCount} NEW
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="font-mono-data text-[10px] text-secondary hover:underline cursor-pointer font-bold tracking-wider uppercase transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/15">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2 font-mono-data">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
                    notifications_paused
                  </span>
                  <p className="text-xs text-on-surface-variant">Zero pending transmissions.</p>
                  <p className="text-[10px] text-on-surface-variant/60">Command channel clear.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const typeStyle = getTypeIcon(notif.type);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                        notif.isRead
                          ? 'hover:bg-surface-variant/20 opacity-75'
                          : 'bg-secondary/5 hover:bg-secondary/10 border-l-2 border-secondary'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl shrink-0 ${typeStyle.bg} ${typeStyle.color} flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-base">{typeStyle.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-bold truncate ${notif.isRead ? 'text-on-surface' : 'text-secondary'}`}>
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_6px_#ffb800] shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 font-body-md">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] font-mono-data text-on-surface-variant/60">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                          {notif.link && (
                            <span className="text-[9px] font-mono-data text-secondary flex items-center gap-0.5">
                              <span>VIEW INTEL</span>
                              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
