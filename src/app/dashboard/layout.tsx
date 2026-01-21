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
import { cn } from '@/lib/utils';
import AnnouncementBell from '@/components/announcement-bell';
import WhatsAppFAB from '@/components/whatsapp-fab';
import AITicketCreator from '@/components/ai-ticket-creator';
import { Sparkles } from 'lucide-react';

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
    const isDashboardHomePage = pathname === '/dashboard';

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
        <div className="flex h-screen w-full items-center justify-center">
          <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
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
                        <AITicketCreator>
                            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                                <Sparkles className="mr-2 h-4 w-4" />
                                Create with AI
                            </Button>
                        </AITicketCreator>
                        <ReportIssueForm>
                            <Button className="bg-green-500 hover:bg-green-600 rounded-md">Report an Issue</Button>
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
                        className="object-contain"
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
