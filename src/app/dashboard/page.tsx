'use client';
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
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
       <div className="relative h-[200px] -mx-4 md:-mx-8 overflow-hidden">
        <Image
          src="/background.png"
          alt="Dashboard Banner"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="mt-8">
        <DashboardClient tickets={tickets} stats={stats} />
      </div>
    </div>
  );
}
