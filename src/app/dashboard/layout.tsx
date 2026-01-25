'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { cn } from '@/lib/utils';
import WhatsAppFAB from '@/components/whatsapp-fab';
import { isAdmin } from '@/lib/admins';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

type UserProfile = {
  role: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const pathname = usePathname();
    const hasRedirected = useRef(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const isPrivilegedUser = useMemo(() => {
        if (!user) return false;
        if (isAdmin(user.email)) return true;
        if (!userProfile) return false;
        return ['Admin', 'it-support', 'Head'].includes(userProfile.role);
    }, [user, userProfile]);

    const isTicketPage = pathname.startsWith('/dashboard/ticket/');
    const loading = userLoading || profileLoading;

    useEffect(() => {
        if (loading || hasRedirected.current) {
            return;
        }
        if (!user) {
            hasRedirected.current = true;
            router.replace('/');
        } else if (isPrivilegedUser && !isTicketPage) {
            hasRedirected.current = true;
            if (userProfile?.role === 'it-support') {
              router.replace('/admin/tickets');
            } else {
              router.replace('/admin');
            }
        }
    }, [user, loading, router, isPrivilegedUser, userProfile, pathname, isTicketPage]);
    
    if (loading || !user || (isPrivilegedUser && !isTicketPage)) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }
    
    const isDashboardHomePage = pathname === '/dashboard';
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-100 dark:bg-gray-950">
            {!isTicketPage && (
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-white px-4 text-card-foreground sm:px-6">
                    <Link
                    href='/dashboard'
                    className="flex items-center gap-2 font-headline"
                    >
                    <Image src="https://picsum.photos/seed/cheezious-icon/32/32" data-ai-hint="logo icon" alt="Logo" width={32} height={32} className="rounded-sm" />
                    <div className="flex flex-col leading-tight">
                        <span className="font-bold text-base">Cheezious</span>
                        <span className="text-xs">IT Support</span>
                    </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ReportIssueForm>
                            <Button className="rounded-md">Report<span className="hidden sm:inline"> an Issue</span></Button>
                        </ReportIssueForm>
                        <UserNav />
                    </div>
                </header>
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
