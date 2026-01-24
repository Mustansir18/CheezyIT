'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { type Ticket, getStats } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';

const useUser = () => {
    const [user, setUser] = useState<{ email: string; } | null>(null);
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

const mockTickets: (Ticket & { id: string })[] = [
    { id: 'mock-1', ticketId: 'TKT-001', userId: 'user@example.com', title: 'Wifi not working in my office', region: 'Region A', status: 'Open', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), updatedAt: new Date(), description: '...' },
    { id: 'mock-2', ticketId: 'TKT-004', userId: 'user@example.com', title: 'My old issue from last week', region: 'Region A', status: 'Closed', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), updatedAt: new Date(), description: '...' }
];


export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const stats = getStats(mockTickets);

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
      <DashboardClient tickets={mockTickets} stats={stats} />
    </div>
  );
}
