
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { type Ticket } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import { useUser } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  // For now, we'll keep fetching mock tickets.
  // In a real app, this would fetch from Firestore.
  const tickets: Ticket[] = []; // Start with empty and fetch inside client
  const stats = { pending: 0, inProgress: 0, resolved: 0};

  const bannerImage = PlaceHolderImages.find(p => p.id === 'dashboard-banner');

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
    <div className="space-y-8">
       {bannerImage && (
        <div className="overflow-hidden rounded-lg shadow-md">
          <Image
            src={bannerImage.imageUrl}
            alt={bannerImage.description}
            width={1200}
            height={300}
            className="w-full object-cover"
            priority
            data-ai-hint={bannerImage.imageHint}
          />
        </div>
      )}
      <DashboardClient tickets={tickets} stats={stats} />
    </div>
  );
}
