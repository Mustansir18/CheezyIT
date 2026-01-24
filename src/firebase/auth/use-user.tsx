'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { useAuth } from '../provider';

// Define a user shape that is serializable
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Convert Firebase user to a serializable object
const mapUser = (user: FirebaseAuthUser): User => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
});

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading };
}
