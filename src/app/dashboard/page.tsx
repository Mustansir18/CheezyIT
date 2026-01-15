
'use client';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { getTickets, getStats, type Ticket } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';
import { useUser } from '@/firebase';
import { isAdmin } from '@/lib/admins';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  // For now, we'll keep fetching mock tickets.
  // In a real app, this would fetch from Firestore.
  const tickets: Ticket[] = []; // Start with empty and fetch inside client
  const stats = { pending: 0, inProgress: 0, resolved: 0};

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);
  
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          {isAdmin(user?.uid) && (
            <Button asChild variant="secondary">
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          <ReportIssueForm>
             <Button>Report an Issue</Button>
          </ReportIssueForm>
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Dashboard
          </h1>
        </div>
        <DashboardClient tickets={tickets} stats={stats} />
      </main>
    </div>
  );
}
