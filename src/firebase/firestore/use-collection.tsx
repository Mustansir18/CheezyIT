'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, type Query, type DocumentData } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export type WithId<T> = T & { id: string };

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedQuery = useMemoFirebase(() => query, [query]);

  useEffect(() => {
    if (!memoizedQuery) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (querySnapshot) => {
        const result: WithId<T>[] = [];
        querySnapshot.forEach((doc) => {
          result.push({ id: doc.id, ...doc.data() });
        });
        setData(result);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching collection:`, err);
        const permissionError = new FirestorePermissionError({
          path: memoizedQuery.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return { data, isLoading, error };
}
