'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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

  const isAdminHomePage = pathname === '/admin';

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
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
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
    <div className="flex min-h-screen w-full flex-col bg-gray-100 dark:bg-gray-950">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-white px-4 text-card-foreground sm:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-headline"
        >
          <Image src="/logo.png" alt="Cheezious IT Support Logo" width={40} height={40} />
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
      {isAdminHomePage && (
        <div className="relative h-[200px] w-full overflow-hidden">
            <Image
                src="/background.png"
                alt="Dashboard Banner"
                fill
                className="object-contain"
                priority
            />
        </div>
      )}
      <main className="flex flex-1 flex-col px-4 pb-4 pt-8 md:px-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
