"use client";

import { useEffect, useState } from "react";
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/firestore/notifications";
import { Notification } from "@/types";

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, setNotifications);
    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => markNotificationRead(id);
  const markAllRead = () => userId ? markAllNotificationsRead(userId) : Promise.resolve();

  return { notifications, unreadCount, markRead, markAllRead };
}
