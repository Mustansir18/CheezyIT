
'use client';

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

type FirebaseContextValue = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<FirebaseContextValue | null>(null);

  useEffect(() => {
    const { firebaseApp, auth, firestore } = initializeFirebase();
    setContext({ firebaseApp, auth, firestore });
  }, []);

  if (!context) {
    return null; // Or a loading spinner
  }

  return (
    <FirebaseContext.Provider value={context}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;

