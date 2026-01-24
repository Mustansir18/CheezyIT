'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { type Ticket, getStats, initialMockTickets } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; role: string; } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<(Ticket & {id: string})[]>([]);
  const router = useRouter();

  const loadData = useCallback(() => {
    const userJson = localStorage.getItem('mockUser');
    if (userJson) setUser(JSON.parse(userJson));

    const ticketsJson = localStorage.getItem('mockTickets');
    if (ticketsJson) {
        setTickets(JSON.parse(ticketsJson).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
        })));
    } else {
        localStorage.setItem('mockTickets', JSON.stringify(initialMockTickets));
        setTickets(initialMockTickets);
    }
  }, []);

  useEffect(() => {
    loadData();
    setLoading(false);

    const handleStorage = (e: StorageEvent) => {
        if (e.key === 'mockTickets' || e.key === 'mockUser') {
            loadData();
        }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);


  const userTickets = useMemo(() => {
    if (!user) return [];
    return tickets
      .filter(ticket => ticket.userId === user.email)
      .filter(ticket => ticket.status !== 'Closed');
  }, [tickets, user]);

  const stats = useMemo(() => {
    if(!user) return { open: 0, inProgress: 0, resolved: 0, closed: 0 };
    return getStats(tickets.filter(ticket => ticket.userId === user.email));
  }, [tickets, user]);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);
  
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
