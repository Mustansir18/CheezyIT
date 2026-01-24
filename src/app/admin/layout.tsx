'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { isAdmin } from '@/lib/admins';
import { UserNav } from '@/components/user-nav';
import { cn } from '@/lib/utils';
import AnnouncementBell from '@/components/announcement-bell';
import { Button } from '@/components/ui/button';

type UserProfile = {
  role: string;
  blockedUntil?: Date;
}

// Mock useUser hook
const useUser = () => {
    const [user, setUser] = useState<{ email: string; displayName: string, role: string} | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userJson = localStorage.getItem('mockUser');
        if (userJson) {
            setUser(JSON.parse(userJson));
        }
        setLoading(false);
    }, []);
    return { user, loading };
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'it-support') return true;
    return false;
  }, [user]);
  
  const isBlocked = false; // Mocking this as there's no live data

  useEffect(() => {
    if (loading) {
        return;
    }
    if (!user) {
      router.replace('/');
    } else if (!isAuthorized) {
      router.replace('/dashboard');
    }
  }, [user, loading, isAuthorized, router]);

  if (loading || !user || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
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
                className="object-cover"
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
