
'use client';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { type Ticket } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import { useUser } from '@/firebase';

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
    <>
        <div className="flex flex-col items-center justify-between space-y-2">
          <Image src="/background.png" alt="Dashboard Banner" width={1200} height={200} className="w-full h-auto rounded-lg" quality={100} />
          <h1 className="text-2xl font-bold tracking-tight pt-2">{user.displayName}'s Dashboard</h1>
        </div>
        <DashboardClient tickets={tickets} stats={stats} />
    </>
  );
}
