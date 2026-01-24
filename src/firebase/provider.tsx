'use client';
import React, { createContext, useContext, useMemo } from 'react';
import {
  type FirebaseApp,
  type FirebaseOptions,
  initializeApp,
} from 'firebase/app';
import {
  type Auth,
  getAuth,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { 
  type FirebaseStorage, 
  getStorage,
  connectStorageEmulator
} from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function initializeFirebaseServices(options: FirebaseOptions) {
  if (!firebaseApp) {
    firebaseApp = initializeApp(options);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);

    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      const host = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
      console.log(`Using Firebase Emulator at ${host}`);
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(firestore, host, 8080);
      connectStorageEmulator(storage, host, 9199);
    }
  }
  return { app: firebaseApp, auth, firestore, storage };
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo(() => initializeFirebaseServices(firebaseConfig), []);

  if (!services.app || !services.auth || !services.firestore) {
    return (
      <div>
        There is no Firebase configuration. Please create a{" "}
        <code>.env.local</code> file and set the Firebase options.
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={services as FirebaseContextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

// Hooks to easily access Firebase services
export const useFirebaseApp = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  return context.app;
};

export const useAuth = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    // Return null or a mock object if you want to support contexts without Firebase
    return null;
  }
  return context.auth;
};

export const useFirestore = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  return context.firestore;
};

export const useStorage = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a FirebaseProvider');
  }
  return context.storage;
};

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export const useMemoFirebase = (fn: any, deps: any) => useMemo(fn, deps);
