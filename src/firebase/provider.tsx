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

const MissingFirebaseConfig = () => {
    const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];
    
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            padding: '2rem',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '700px',
                padding: '2rem',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                backgroundColor: 'white'
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Firebase Configuration Missing</h1>
                <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                    Your production app is not configured to connect to Firebase. One or more required environment variables are missing.
                    <br />
                    This can happen if they were not set correctly in your hosting provider's settings <strong>before</strong> your last deployment.
                </p>
                <div style={{ textAlign: 'left', marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                    <h2 style={{ fontWeight: 'bold' }}>How to Fix:</h2>
                    <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li>
                            <strong>Verify Variables:</strong> Go to your hosting provider's dashboard (e.g., Firebase App Hosting, Vercel, Netlify). In the "Environment Variables" section for your project, ensure that <strong>all</strong> of the following variables are present and have the correct values from your Firebase project settings:
                            <div style={{
                                backgroundColor: '#fee2e2',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                marginTop: '0.75rem',
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                wordBreak: 'break-all',
                            }}>
                                {requiredVars.map(v => <div key={v}>{v}</div>)}
                            </div>
                             <p style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>Note: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is optional.</p>
                        </li>
                        <li>
                            <strong>Re-deploy Your App:</strong> After adding or correcting the variables, you <strong>must</strong> trigger a new deployment. Next.js includes environment variables at build time, so a new build is required for the changes to take effect.
                        </li>
                    </ol>
                </div>
                 <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                    The application cannot start until it can connect to Firebase.
                </p>
            </div>
        </div>
    );
};


export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  // Check if essential Firebase config values are present.
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return <MissingFirebaseConfig />;
  }

  const services = useMemo(() => initializeFirebaseServices(firebaseConfig), []);

  if (!services.app || !services.auth || !services.firestore) {
    // This is a fallback for other initialization errors.
    return <MissingFirebaseConfig />;
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
