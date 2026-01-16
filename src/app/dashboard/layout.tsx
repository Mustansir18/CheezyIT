
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { isAdmin } from '@/lib/admins';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold font-headline"
                >
                <Image src="/logo.png" alt="IT Support Logo" width={32} height={32} />
                <span>IT Support</span>
                </Link>
                <div className="ml-auto flex items-center gap-4">
                {isClient ? (
                    <>
                        {isAdmin(user?.email) && (
                            <Button asChild variant="secondary">
                            <Link href="/admin">Admin</Link>
                            </Button>
                        )}
                        <ReportIssueForm>
                            <Button>Report an Issue</Button>
                        </ReportIssueForm>
                        <UserNav />
                    </>
                    ) : (
                        <>
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-10 w-36" />
                            <Skeleton className="h-9 w-9 rounded-full" />
                        </>
                    )}
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {children}
            </main>
        </div>
    )
}
