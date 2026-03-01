import { create } from "zustand";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  alertId: string | null;
  metadata: string | null;
  createdAt: string;
}

interface NotificationStoreState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  pollTimers: ReturnType<typeof setInterval>[];

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  checkAlerts: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationStoreState>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    pollTimers: [],

    fetchNotifications: async () => {
      set({ loading: true });
      try {
        const res = await fetch("/api/notifications?limit=50");
        if (res.ok) {
          const data = await res.json();
          set({ notifications: data });
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        set({ loading: false });
      }
    },

    fetchUnreadCount: async () => {
      try {
        const res = await fetch("/api/notifications/count");
        if (res.ok) {
          const data = await res.json();
          set({ unreadCount: data.unread });
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    },

    markAsRead: async (ids: string[]) => {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        set((s) => ({
          notifications: s.notifications.map((n) =>
            ids.includes(n.id) ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, s.unreadCount - ids.length),
        }));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    },

    markAllAsRead: async () => {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      } catch (error) {
        console.error("Failed to mark all as read:", error);
      }
    },

    checkAlerts: async () => {
      try {
        await fetch("/api/alerts/check", { method: "POST" });
        // Refresh counts after checking
        get().fetchUnreadCount();
      } catch (error) {
        console.error("Failed to check alerts:", error);
      }
    },

    startPolling: () => {
      const state = get();
      // Prevent duplicate timers
      if (state.pollTimers.length > 0) return;

      // Initial fetch
      state.fetchUnreadCount();
      state.checkAlerts();

      const countTimer = setInterval(() => {
        get().fetchUnreadCount();
      }, 60_000); // every 60 seconds

      const alertTimer = setInterval(() => {
        get().checkAlerts();
      }, 300_000); // every 5 minutes

      set({ pollTimers: [countTimer, alertTimer] });
    },

    stopPolling: () => {
      const { pollTimers } = get();
      pollTimers.forEach(clearInterval);
      set({ pollTimers: [] });
    },
  })
);
