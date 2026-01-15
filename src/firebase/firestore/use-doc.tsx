
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T>(path: string) {
  const db = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const docRef = doc(db, path);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData({ id: snapshot.id, ...snapshot.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    },
    async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [db, path]);

  return { data, loading };
}
