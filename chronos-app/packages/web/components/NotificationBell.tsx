'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, ShoppingBag, Package, AlertCircle, Info } from 'lucide-react';
import { useNotifications, NotificationType } from './NotificationContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
    purchase_success: <ShoppingBag size={16} className="text-green-400" />,
    listing_created: <Package size={16} className="text-primary" />,
    item_sold: <ShoppingBag size={16} className="text-yellow-400" />,
    system: <AlertCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
};

function formatTimeAgo(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-xl transition-all",
                    isOpen
                        ? "bg-primary text-background"
                        : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                )}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <Bell size={14} className="text-primary" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </h3>
                        <div className="flex gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-primary transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCheck size={16} />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-80">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-white/30">
                                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-mono">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group",
                                        !notification.read && "bg-primary/5 border-l-2 border-l-primary"
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className="shrink-0 size-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            {NOTIFICATION_ICONS[notification.type]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-white truncate">{notification.title}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeNotification(notification.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-all"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{notification.message}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] text-white/30 font-mono">{formatTimeAgo(notification.timestamp)}</span>
                                                {notification.link && (
                                                    <Link
                                                        href={notification.link}
                                                        onClick={() => setIsOpen(false)}
                                                        className="text-[10px] text-primary font-bold hover:underline"
                                                    >
                                                        View →
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
