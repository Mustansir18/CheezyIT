'use client';
import { useMemo } from 'react';
import Image from 'next/image';

import { type Ticket, getStats } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // The user profile check is in the layout, so we can assume user exists here.
  const ticketsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'tickets'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  
  const { data: tickets, isLoading: ticketsLoading } = useCollection<Ticket>(ticketsQuery);

  const userTickets = useMemo(() => {
    if (!tickets) return [];
    // The layout already redirects privileged users, but we can filter here as a safeguard
    // and to only show non-closed tickets.
    return tickets.filter(ticket => ticket.status !== 'Closed');
  }, [tickets]);

  const allUserTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets;
  }, [tickets]);
  
  const stats = useMemo(() => {
    return getStats(allUserTickets);
  }, [allUserTickets]);

  const loading = userLoading || ticketsLoading;

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <DashboardClient tickets={userTickets} stats={stats} />
    </div>
  );
}
