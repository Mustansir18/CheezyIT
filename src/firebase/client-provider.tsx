'use client';

import React from 'react';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Firebase is detached, so this provider just renders its children.
  return <>{children}</>;
}
