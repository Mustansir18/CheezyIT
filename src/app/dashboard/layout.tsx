'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';

import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnnouncementBell from '@/components/announcement-bell';

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

    const isPrivilegedUser = user && (isRoot(user.email) || userProfile?.role === 'it-support' || userProfile?.role === 'Admin');
    const isTicketPage = pathname.startsWith('/dashboard/ticket/');

    useEffect(() => {
        if (!userLoading && !profileLoading) {
          if (!user) {
            router.push('/');
          } else if (isPrivilegedUser && !isTicketPage) {
            router.push('/admin');
          }
        }
    }, [user, userLoading, profileLoading, isPrivilegedUser, isTicketPage, router, pathname]);
    
    if (userLoading || profileLoading || !user || (isPrivilegedUser && !isTicketPage)) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-700">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col">
            {!isTicketPage && (
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-700 bg-gray-800 px-4 text-gray-100 sm:px-6">
                    <Link
                    href='/dashboard'
                    className="flex items-center gap-2 font-semibold font-headline"
                    >
                    <Image src="/logo.png" alt="Cheezious IT Support Logo" width={40} height={40} />
                    <span>Cheezious IT Support</span>
                    </Link>
                    <div className="ml-auto flex items-center gap-4">
                        <AnnouncementBell />
                        <ReportIssueForm>
                            <Button className="bg-green-500 hover:bg-green-600 rounded-md">Report an Issue</Button>
                        </ReportIssueForm>
                        <UserNav />
                    </div>
                </header>
            )}
            <main className={cn(
                "flex flex-1 flex-col",
                isTicketPage ? "min-h-0" : "gap-4 p-4 md:gap-8 md:p-8 bg-white text-black"
            )}>
                {children}
            </main>
        </div>
    )
}
