'use client';
import { EventEmitter } from 'events';

// A simple event emitter for broadcasting errors, particularly Firestore permission errors.
// This allows different parts of the application to listen for and react to these errors.
// For example, the FirebaseErrorListener component listens for 'permission-error'
// and throws the error to make it visible in the Next.js development overlay.
export const errorEmitter = new EventEmitter();
