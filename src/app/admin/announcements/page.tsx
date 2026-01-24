'use client';
import AnnouncementForm from '@/components/announcement-form';
import AnnouncementHistory from '@/components/announcement-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/components/user-management';
import type { Announcement } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export default function AdminAnnouncementsPage() {
  const [user, setUser] = useState<{id: string, email: string; role: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const { toast } = useToast();

  const loadData = useCallback(() => {
      const userJson = localStorage.getItem('mockUser');
      if (userJson) setUser(JSON.parse(userJson));

      const announcementsJson = localStorage.getItem('mockAnnouncements');
      if (announcementsJson) {
        const parsed = JSON.parse(announcementsJson).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          startDate: a.startDate ? new Date(a.startDate) : undefined,
          endDate: a.endDate ? new Date(a.endDate) : undefined,
        }));
        setAnnouncements(parsed);
      }

      const usersJson = localStorage.getItem('mockUsers');
      if (usersJson) setUsers(JSON.parse(usersJson));

      const regionsJson = localStorage.getItem('mockRegions');
      if (regionsJson) setRegions(JSON.parse(regionsJson));

  }, []);

  useEffect(() => {
    loadData();
    setLoading(false);

    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if (e instanceof StorageEvent) {
        if (['mockUser', 'mockAnnouncements', 'mockUsers', 'mockRegions'].includes(e.key || '')) {
            loadData();
        }
      } else {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('local-storage-change', handleStorageChange as EventListener);
    return () => {
        window.removeEventListener('storage', handleStorageChange as EventListener);
        window.removeEventListener('local-storage-change', handleStorageChange as EventListener);
    };
  }, [loadData]);


  const handleAddAnnouncement = useCallback((newAnnouncement: Omit<Announcement, 'id' | 'createdAt' | 'sentBy' | 'readBy'>) => {
    if (!user) return;

    const currentAnnouncements = JSON.parse(localStorage.getItem('mockAnnouncements') || '[]');

    const announcementToAdd: Announcement = {
      ...newAnnouncement,
      id: `announcement-${Date.now()}`,
      createdAt: new Date(),
      sentBy: user.email,
      readBy: [],
    };
    
    const updatedAnnouncements = [announcementToAdd, ...currentAnnouncements];
    localStorage.setItem('mockAnnouncements', JSON.stringify(updatedAnnouncements));
    window.dispatchEvent(new Event('local-storage-change'));

  }, [user]);

  const handleDeleteAnnouncement = useCallback((announcementId: string) => {
    const currentAnnouncements = JSON.parse(localStorage.getItem('mockAnnouncements') || '[]');
    const updatedAnnouncements = currentAnnouncements.filter((a: Announcement) => a.id !== announcementId);
    localStorage.setItem('mockAnnouncements', JSON.stringify(updatedAnnouncements));
    window.dispatchEvent(new Event('local-storage-change'));
    toast({ title: 'Announcement Deleted', description: 'The announcement has been removed.' });
  }, [toast]);

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
        <AnnouncementForm users={users} regions={regions} onAddAnnouncement={handleAddAnnouncement} currentUser={user} />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <AnnouncementHistory 
            announcements={announcements} 
            onDelete={handleDeleteAnnouncement}
            canDelete={isAuthorized}
        />
      </TabsContent>
    </Tabs>
  );
}
