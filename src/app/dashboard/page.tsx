import Link from 'next/link';
import { HardDrive } from 'lucide-react';

import { getTickets, getStats, getMockUser, type Ticket } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import ReportIssueForm from '@/components/report-issue-form';

export default async function DashboardPage() {
  const tickets: Ticket[] = await getTickets();
  const stats = await getStats(tickets);
  const user = await getMockUser();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold font-headline"
        >
          <HardDrive className="h-6 w-6 text-primary" />
          <span>IssueTrackr</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <ReportIssueForm>
             <Button>Report an Issue</Button>
          </ReportIssueForm>
          <UserNav user={user} />
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
