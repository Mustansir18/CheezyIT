'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { isRoot } from '@/lib/admins';
import { UserNav } from '@/components/user-nav';
import { cn } from '@/lib/utils';
import AnnouncementBell from '@/components/announcement-bell';

type UserProfile = {
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    if (isRoot(user.email)) return true;
    if (userProfile && (userProfile.role === 'it-support' || userProfile.role === 'Admin')) return true;
    return false;
  }, [user, userProfile]);

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user || !isAuthorized) {
        router.push('/dashboard');
      }
    }
  }, [user, userLoading, profileLoading, isAuthorized, router]);

  if (userLoading || profileLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>You are not authorized to view this page.</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold font-headline"
        >
          <Image src="/logo.png" alt="Cheezious IT Support Logo" width={40} height={40} />
          <span>Cheezious IT Support</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <AnnouncementBell />
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
