import React from 'react';
import { Bell, Check, CheckCheck, Trash2, X, MessageSquare, Phone, Sparkles } from 'lucide-react';
import { AppNotification } from '../../types';
import { markNotificationAsRead, clearAllNotifications } from '../../lib/notificationService';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  userId,
  isOpen,
  onClose,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    for (const n of notifications.filter((n) => !n.isRead)) {
      await markNotificationAsRead(n.id);
    }
  };

  const handleClearAll = async () => {
    await clearAllNotifications(userId);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4 text-emerald-400" />;
      case 'story':
        return <Sparkles className="h-4 w-4 text-pink-400" />;
      case 'message':
      case 'group_message':
      default:
        return <MessageSquare className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onClose} className="hover:text-slate-900 dark:hover:text-white ml-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={async () => {
                if (!notif.isRead) {
                  await markNotificationAsRead(notif.id);
                }
                onSelectNotification?.(notif);
              }}
              className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${
                notif.isRead
                  ? 'opacity-75 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  : 'bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{notif.title}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{notif.body}</p>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                  {notif.createdAt?.toDate
                    ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
              {!notif.isRead && (
                <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
