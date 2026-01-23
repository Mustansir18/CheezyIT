'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { isRoot } from '@/lib/admins';
import Image from 'next/image';

type UserProfile = {
  role: string;
};

export default function AuthGatePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const hasRedirected = useRef(false);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isPrivilegedUser = useMemo(() => {
    if (!user) return false;
    if (isRoot(user.email)) return true;
    return userProfile?.role === 'it-support' || userProfile?.role === 'Admin';
  }, [user, userProfile]);

  useEffect(() => {
    // Wait until all data is loaded and we haven't already redirected.
    if (userLoading || profileLoading || hasRedirected.current) {
      return;
    }

    // If there is no user, send to login page.
    if (!user) {
      hasRedirected.current = true;
      router.replace('/');
      return;
    }

    // Now we have a user and their profile, so we can redirect.
    hasRedirected.current = true;
    if (isPrivilegedUser) {
      router.replace('/admin');
    } else {
      router.replace('/dashboard');
    }
  }, [user, userLoading, profileLoading, isPrivilegedUser, router]);

  // Show a loading spinner while we determine where to go.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
    </div>
  );
}
