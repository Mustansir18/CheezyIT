'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { formatDistanceToNow } from 'date-fns';
import { isRoot } from '@/lib/admins';

import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { cn } from '@/lib/utils';
import AnnouncementBell from '@/components/announcement-bell';
import WhatsAppFAB from '@/components/whatsapp-fab';

type UserProfile = {
  role: string;
  blockedUntil?: Timestamp;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: userLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const loading = userLoading || profileLoading;

    const isPrivilegedUser = useMemo(() => {
        if (!user) return false;
        if (isRoot(user.email)) return true;
        return userProfile?.role === 'it-support' || userProfile?.role === 'Admin';
    }, [user, userProfile]);
    
    const isTicketPage = pathname.startsWith('/dashboard/ticket/');
    const isDashboardHomePage = pathname === '/dashboard';
    
    const isBlocked = useMemo(() => {
      return userProfile?.blockedUntil && userProfile.blockedUntil.toDate() > new Date();
    }, [userProfile]);

    useEffect(() => {
        if (loading) {
            return;
        }
        if (!user) {
            router.replace('/');
        } else if (isPrivilegedUser && !isBlocked) {
            router.replace('/admin');
        }
    }, [user, loading, isPrivilegedUser, isBlocked, router]);
    
    if (loading || !user || (isPrivilegedUser && !isBlocked)) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
    }
    
    if (isBlocked) {
        const blockExpires = formatDistanceToNow(userProfile.blockedUntil!.toDate(), { addSuffix: true });
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
                <h1 className="text-2xl font-bold">Account Blocked</h1>
                <p className="text-muted-foreground">Your account has been temporarily blocked by an administrator.</p>
                <p>Access will be restored {blockExpires}.</p>
                <Button onClick={() => signOut(auth)} variant="outline">Sign Out</Button>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-100 dark:bg-gray-950">
            {!isTicketPage && (
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-white px-4 text-card-foreground sm:px-6">
                    <Link
                    href='/dashboard'
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
                        <ReportIssueForm>
                            <Button className="rounded-md">Report an Issue</Button>
                        </ReportIssueForm>
                        <UserNav />
                    </div>
                </header>
            )}
            {isDashboardHomePage && (
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
            <main className={cn(
                "flex flex-1 flex-col",
                isTicketPage ? "min-h-0" : "px-4 pb-4 md:px-8 md:pb-8 pt-8"
            )}>
                {children}
            </main>
            <WhatsAppFAB />
        </div>
    )
}
