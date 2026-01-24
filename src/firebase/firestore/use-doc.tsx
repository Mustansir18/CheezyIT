'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export type WithId<T> = T & { id: string };

export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedDocRef = useMemoFirebase(() => docRef, [docRef]);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setData({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
          setData(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching document:`, err);
        const permissionError = new FirestorePermissionError({
          path: memoizedDocRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}
