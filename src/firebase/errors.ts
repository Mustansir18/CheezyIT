'use client';
import { getAuth } from 'firebase/auth';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

// A custom error class that encapsulates rich context about a Firestore permission error.
// This is thrown on the client and rendered by the Next.js development overlay.
export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  public readonly requestAuthContext: any; // Will be populated with auth state

  constructor(context: SecurityRuleContext) {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    let authContext: any = { uid: null, token: {} };

    if (currentUser) {
      authContext = {
        uid: currentUser.uid,
        token: {
          name: currentUser.displayName,
          picture: currentUser.photoURL,
          email: currentUser.email,
          email_verified: currentUser.emailVerified,
          phone_number: currentUser.phoneNumber,
          // Note: Simulating the 'firebase.identities' structure for the rules simulator
          firebase: {
            identities: currentUser.providerData.reduce((acc: any, provider) => {
              if (provider.providerId.includes('.com')) {
                acc[provider.providerId] = [provider.uid];
              }
              return acc;
            }, {}),
            sign_in_provider: currentUser.providerData.length > 0 ? currentUser.providerData[0].providerId : 'custom',
          },
        },
      };
    }
    
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify({
      auth: authContext,
      method: context.operation,
      path: `/databases/(default)/documents/${context.path}`,
      ...(context.requestResourceData && { resource: context.requestResourceData }),
    }, null, 2)}`;
    
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    this.requestAuthContext = authContext;
  }
}
