'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { isAdmin } from '@/lib/admins';

import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { cn } from '@/lib/utils';
import WhatsAppFAB from '@/components/whatsapp-fab';

const useUser = () => {
    const [user, setUser] = useState<{ email: string; role: string; } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userJson = localStorage.getItem('mockUser');
        if (userJson) {
            setUser(JSON.parse(userJson));
        }
        setLoading(false);
    }, []);

    return { user, loading };
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const hasRedirected = useRef(false);

    const isPrivilegedUser = useMemo(() => {
        if (!user) return false;
        if (['Admin', 'it-support', 'Head'].includes(user.role)) return true;
        return false;
    }, [user]);

    useEffect(() => {
        if (loading || hasRedirected.current) {
            return;
        }
        if (!user) {
            hasRedirected.current = true;
            router.replace('/');
        } else if (isPrivilegedUser) {
            hasRedirected.current = true;
            if (user.role === 'it-support') {
              router.replace('/admin/tickets');
            } else {
              router.replace('/admin');
            }
        }
    }, [user, loading, router, isPrivilegedUser]);
    
    if (loading || !user || isPrivilegedUser) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
    }
    
    const isTicketPage = pathname.startsWith('/dashboard/ticket/');
    const isDashboardHomePage = pathname === '/dashboard';
    
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
