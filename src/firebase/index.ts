'use client';
import {
  FirebaseProvider,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
  useFirebase,
  useMemoFirebase,
} from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import { useUser, type User } from './auth/use-user';
import { FirestorePermissionError, type SecurityRuleContext } from './errors';
import { errorEmitter } from './error-emitter';

export type { User, SecurityRuleContext };
export {
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebaseApp,
  useAuth,
  useFirestore,
  useStorage,
  useFirebase,
  useUser,
  useCollection,
  useDoc,
  useMemoFirebase,
  FirestorePermissionError,
  errorEmitter
};
export type { WithId } from './firestore/use-collection';
