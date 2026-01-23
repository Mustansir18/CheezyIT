'use client';
import React, { useMemo } from 'react';

export const useUser = () => {
    const userJson = typeof window !== 'undefined' ? localStorage.getItem('mockUser') : null;
    if (userJson) {
        return { user: JSON.parse(userJson), loading: false };
    }
    return { user: null, loading: false };
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

export const useFirestore = () => null;
export const useFirebase = () => ({});
export const useFirebaseApp = () => null;
export const useStorage = () => null;
export const useMemoFirebase = (fn: any, deps: any) => useMemo(fn, deps);

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
