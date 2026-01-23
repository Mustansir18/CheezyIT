'use client';
// Firebase is detached. This is a no-op implementation.
export class FirestorePermissionError extends Error {
  constructor() {
    super("Firebase is detached.");
    this.name = 'FirebaseError';
  }
}
