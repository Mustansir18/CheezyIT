
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where, type Query, type CollectionReference } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(collectionName: string, uid?: string) {
  const db = useFirestore();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    let colRef: Query | CollectionReference = collection(db, collectionName);

    if (uid) {
      colRef = query(colRef, where('uid', '==', uid));
    }
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const result: T[] = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(result);
      setLoading(false);
    },
    async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: (colRef as CollectionReference).path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [db, collectionName, uid]);

  return { data, loading };
}
