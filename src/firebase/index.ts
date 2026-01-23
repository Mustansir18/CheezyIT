
'use client';
import { useMemo } from 'react';

export const useUser = () => {
    const userJson = typeof window !== 'undefined' ? localStorage.getItem('mockUser') : null;
    const user = userJson ? JSON.parse(userJson) : null;
    return { user, loading: false };
};

export const useAuth = () => {
    return {
        signOut: () => {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('mockUser');
            }
        }
    }
};

export const useCollection = () => ({ data: [], isLoading: false, error: null });
export const useDoc = () => ({ data: null, isLoading: false, error: null });
export const useFirestore = () => null;
export const useFirebaseApp = () => null;
export const useFirebase = () => ({});

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const FirebaseClientProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useMemoFirebase = (fn: any) => useMemo(fn, []);

export class FirestorePermissionError extends Error { constructor() { super("Firebase is detached."); this.name = 'FirebaseError' } };
export const errorEmitter = { on: () => {}, off: () => {}, emit: () => {} };

export const initializeFirebase = () => {};
