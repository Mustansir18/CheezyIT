'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Image from 'next/image';

import { UserNav } from '@/components/user-nav';
import AnnouncementBell from '@/components/announcement-bell';
import { Button } from '@/components/ui/button';
import { isAdmin } from '@/lib/admins';
import { Loader2 } from 'lucide-react';

type UserProfile = {
  role: string;
  blockedUntil?: any;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    if (isAdmin(user.email)) return true;
    if (!userProfile) return false;
    return ['Admin', 'it-support', 'Head'].includes(userProfile.role);
  }, [user, userProfile]);

  const isBlocked = useMemo(() => {
      if (!userProfile?.blockedUntil) return false;
      const blockedDate = userProfile.blockedUntil.toDate ? userProfile.blockedUntil.toDate() : new Date(userProfile.blockedUntil);
      return blockedDate > new Date();
  }, [userProfile]);
  
  const loading = userLoading || profileLoading;

  useEffect(() => {
    // If the logged-in user is the root admin but doesn't have a profile document in Firestore, create one.
    if (!loading && user && isAdmin(user.email) && !userProfile && firestore) {
      console.log('Admin user profile not found, creating one...');
      const adminProfileData = {
        displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
        email: user.email,
        role: 'Admin',
        regions: ['all'],
      };
      setDoc(doc(firestore, 'users', user.uid), adminProfileData)
        .then(() => console.log('Admin user profile created successfully.'))
        .catch(e => console.error("Error creating admin user profile:", e));
    }
  }, [loading, user, userProfile, firestore]);

  useEffect(() => {
    if (loading) {
        return;
    }
    if (!user) {
      router.replace('/');
    } else if (isBlocked) {
        // Handle blocked user logic if needed, e.g. sign out and redirect
        // auth?.signOut();
        // router.replace('/blocked');
    } else if (!isAuthorized) {
      router.replace('/dashboard');
    }
  }, [user, loading, isAuthorized, isBlocked, router]);

  if (loading || !user || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const isAdminHomePage = pathname === '/admin';

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-100 dark:bg-gray-950">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-white px-4 text-card-foreground sm:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-headline"
        >
          <Image src="https://picsum.photos/seed/cheezious-icon/32/32" data-ai-hint="logo icon" alt="Logo" width={32} height={32} className="rounded-sm" />
          <div className="flex flex-col leading-tight">
              <span className="font-bold text-base">Cheezious</span>
              <span className="text-xs">IT Support</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <AnnouncementBell />
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 pb-4 pt-8 md:px-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
