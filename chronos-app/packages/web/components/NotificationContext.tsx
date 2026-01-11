'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { getSupabase, isSupabaseConfigured, DbNotification } from '@/lib/supabase';

export type NotificationType = 'purchase_success' | 'listing_created' | 'item_sold' | 'system' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    removeNotification: (id: string) => void;
    isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'oneway_notifications';

// Convert DB notification to app notification
function dbToNotification(db: DbNotification): Notification {
    return {
        id: db.id,
        type: db.type as NotificationType,
        title: db.title,
        message: db.message || '',
        timestamp: new Date(db.created_at).getTime(),
        read: db.read,
        link: db.link || undefined,
    };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { address } = useAccount();

    // Load notifications from localStorage as fallback
    const loadLocalNotifications = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                return parsed.filter((n: Notification) => n.timestamp > weekAgo);
            }
        } catch (e) {
            console.warn('Failed to load local notifications:', e);
        }
        return [];
    }, []);

    // Save to localStorage as backup
    const saveLocalNotifications = useCallback((notifs: Notification[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
        } catch (e) {
            console.warn('Failed to save local notifications:', e);
        }
    }, []);

    // Fetch notifications from Supabase
    const fetchNotifications = useCallback(async () => {
        const supabase = getSupabase();
        if (!address || !supabase) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('wallet_address', address.toLowerCase())
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const notifs = (data || []).map(dbToNotification);
            setNotifications(notifs);
            saveLocalNotifications(notifs);
        } catch (e) {
            console.warn('Failed to fetch from Supabase, using local:', e);
            setNotifications(loadLocalNotifications());
        } finally {
            setIsLoading(false);
        }
    }, [address, loadLocalNotifications, saveLocalNotifications]);

    // Initialize
    useEffect(() => {
        setMounted(true);

        if (!isSupabaseConfigured()) {
            // Fallback to localStorage
            setNotifications(loadLocalNotifications());
        }
    }, [loadLocalNotifications]);

    // Fetch when wallet connects
    useEffect(() => {
        if (mounted && address && isSupabaseConfigured()) {
            fetchNotifications();
        }
    }, [mounted, address, fetchNotifications]);

    // Set up real-time subscription
    useEffect(() => {
        const supabase = getSupabase();
        if (!mounted || !address || !supabase) return;

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `wallet_address=eq.${address.toLowerCase()}`,
                },
                (payload) => {
                    const newNotif = dbToNotification(payload.new as DbNotification);
                    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `wallet_address=eq.${address.toLowerCase()}`,
                },
                (payload) => {
                    const updated = dbToNotification(payload.new as DbNotification);
                    setNotifications(prev =>
                        prev.map(n => n.id === updated.id ? updated : n)
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `wallet_address=eq.${address.toLowerCase()}`,
                },
                (payload) => {
                    const deletedId = (payload.old as any).id;
                    setNotifications(prev => prev.filter(n => n.id !== deletedId));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [mounted, address]);

    // Save to localStorage whenever notifications change (backup)
    useEffect(() => {
        if (mounted) {
            saveLocalNotifications(notifications);
        }
    }, [notifications, mounted, saveLocalNotifications]);

    const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false,
        };

        // Optimistic update
        setNotifications(prev => [newNotification, ...prev].slice(0, 50));

        // Save to Supabase if configured and wallet connected
        const supabase = getSupabase();
        if (supabase && address) {
            try {
                await supabase.from('notifications').insert({
                    wallet_address: address.toLowerCase(),
                    type: notification.type,
                    title: notification.title,
                    message: notification.message || null,
                    link: notification.link || null,
                    read: false,
                });
            } catch (e) {
                console.warn('Failed to save notification to Supabase:', e);
            }
        }
    }, [address]);

    const markAsRead = useCallback(async (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );

        const supabase = getSupabase();
        if (supabase) {
            try {
                await supabase.from('notifications').update({ read: true }).eq('id', id);
            } catch (e) {
                console.warn('Failed to mark as read in Supabase:', e);
            }
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        const supabase = getSupabase();
        if (supabase && address) {
            try {
                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('wallet_address', address.toLowerCase())
                    .eq('read', false);
            } catch (e) {
                console.warn('Failed to mark all as read in Supabase:', e);
            }
        }
    }, [address]);

    const clearAll = useCallback(async () => {
        setNotifications([]);

        const supabase = getSupabase();
        if (supabase && address) {
            try {
                await supabase
                    .from('notifications')
                    .delete()
                    .eq('wallet_address', address.toLowerCase());
            } catch (e) {
                console.warn('Failed to clear notifications in Supabase:', e);
            }
        }
    }, [address]);

    const removeNotification = useCallback(async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));

        const supabase = getSupabase();
        if (supabase) {
            try {
                await supabase.from('notifications').delete().eq('id', id);
            } catch (e) {
                console.warn('Failed to remove notification from Supabase:', e);
            }
        }
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearAll,
            removeNotification,
            isLoading,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}
