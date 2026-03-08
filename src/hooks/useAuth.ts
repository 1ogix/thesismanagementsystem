"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDocument } from "@/lib/firestore/users";
import { useAuthStore } from "@/store/authStore";

export function useAuthListener() {
  const { setFirebaseUser, setTmsUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const tmsUser = await getUserDocument(user.uid);
        setTmsUser(tmsUser);
      } else {
        setTmsUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setFirebaseUser, setTmsUser, setLoading]);
}

export function useAuth() {
  const { firebaseUser, tmsUser, loading } = useAuthStore();
  return { firebaseUser, tmsUser, loading, role: tmsUser?.role ?? null };
}
