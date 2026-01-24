'use client';
import AnnouncementForm from '@/components/announcement-form';
import AnnouncementHistory from '@/components/announcement-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { isAdmin } from '@/lib/admins';
import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/components/user-management';

const mockUsersList: User[] = [
    { id: 'admin-user-id', displayName: 'Admin', email: 'mustansir133@gmail.com', role: 'Admin', regions: ['all'], blockedUntil: null },
    { id: 'head-user-1', displayName: 'Head User', email: 'head@example.com', role: 'Head', regions: ['all'], blockedUntil: null },
    { id: 'support-user-1', displayName: 'Support Person', email: 'support@example.com', role: 'it-support', regions: ['Region A', 'Region B'], blockedUntil: null },
    { id: 'user-1', displayName: 'Demo User', email: 'user@example.com', role: 'User', region: 'Region A', blockedUntil: null },
];
const initialRegions = ['Region A', 'Region B', 'Region C'];


export default function AdminAnnouncementsPage() {
  const [user, setUser] = useState<{email: string; role: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userJson = localStorage.getItem('mockUser');
    if (userJson) {
      setUser(JSON.parse(userJson));
    }
    setLoading(false);
  }, []);

  const userIsAdmin = useMemo(() => user?.role === 'Admin', [user]);
  const router = useRouter();

  const isAuthorized = useMemo(() => {
    if (user && (user.role === 'Admin' || user.role === 'Head')) return true;
    return false;
  }, [user]);

  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push('/admin');
    }
  }, [loading, isAuthorized, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="send" className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsAdmin && "text-primary")}>
            Announcements
          </h1>
        </div>
        <TabsList>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="send" className="mt-4">
        <AnnouncementForm users={mockUsersList} regions={initialRegions} />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <AnnouncementHistory />
      </TabsContent>
    </Tabs>
  );
}
