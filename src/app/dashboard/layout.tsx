'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isAdmin } from '@/lib/admins';

import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type UserProfile = {
  role: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!userLoading && !profileLoading) {
          if (!user) {
            router.push('/');
          }
        }
    }, [user, userLoading, profileLoading, router]);
    
    const isPrivilegedUser = user && (isAdmin(user.email) || userProfile?.role === 'it-support');
    const isTicketPage = pathname.startsWith('/dashboard/ticket/');

    if (userLoading || profileLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    if (!user) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-muted/40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {!isTicketPage && (
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <Link
                    href={isPrivilegedUser ? '/admin' : '/dashboard'}
                    className="flex items-center gap-2 font-semibold font-headline"
                    >
                    <Image src="/logo.png" alt="IT Support Logo" width={32} height={32} />
                    <span>IT Support</span>
                    </Link>
                    <div className="ml-auto flex items-center gap-4">
                        {!isPrivilegedUser && (
                            <ReportIssueForm>
                                <Button>Report an Issue</Button>
                            </ReportIssueForm>
                        )}
                        {isPrivilegedUser && (
                             <Button asChild variant="outline">
                                <Link href="/admin">Admin Dashboard</Link>
                            </Button>
                        )}
                        <UserNav />
                    </div>
                </header>
            )}
            <main className={cn(
                "flex flex-1 flex-col",
                isTicketPage ? "min-h-0" : "gap-4 p-4 md:gap-8 md:p-8"
            )}>
                {children}
            </main>
        </div>
    )
}
