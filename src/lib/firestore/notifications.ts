import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification, NotificationType } from "@/types";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  relatedId: string
): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId,
    type,
    message,
    read: false,
    relatedId,
    createdAt: Timestamp.now(),
  });
}

export async function createNotificationsBulk(
  userIds: string[],
  type: NotificationType,
  message: string,
  relatedId: string
): Promise<void> {
  await Promise.all(
    userIds.map((uid) => createNotification(uid, type, message, relatedId))
  );
}

export async function getUserNotifications(
  userId: string
): Promise<Notification[]> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Notification)
    );
    callback(notifications);
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notifications = await getUserNotifications(userId);
  const unread = notifications.filter((n) => !n.read);
  await Promise.all(unread.map((n) => markNotificationRead(n.id)));
}
