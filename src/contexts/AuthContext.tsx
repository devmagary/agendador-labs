"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AppUser {
  uid: string;
  name: string;
  mustChangePassword: boolean;
  role: "admin" | "professor" | "secretario";
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUser({
          uid: firebaseUser.uid,
          name: data.name || "Usuário",
          mustChangePassword: data.mustChangePassword ?? true,
          role: (data.role as "admin" | "professor" | "secretario") || "professor"
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user data", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
