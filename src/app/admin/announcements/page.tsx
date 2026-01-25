'use client';
import AnnouncementForm from '@/components/announcement-form';
import AnnouncementHistory from '@/components/announcement-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/components/user-management';
import type { Announcement } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { isAdmin } from '@/lib/admins';
import { logActivity } from '@/lib/activity-logger';

const regions = ['ISL', 'LHR', 'South', 'SUG'];

export default function AdminAnnouncementsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const announcementsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'announcements') : null), [firestore]);
  const { data: announcements, isLoading: announcementsLoading } = useCollection<Announcement>(announcementsQuery);
  
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    if (isAdmin(user.email)) return true;
    if (userProfile) return ['Admin', 'Head'].includes(userProfile.role);
    return false;
  }, [user, userProfile]);

  const loading = userLoading || profileLoading || announcementsLoading || usersLoading;

  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push('/admin');
    }
  }, [loading, isAuthorized, router]);


  const handleAddAnnouncement = useCallback(async (newAnnouncement: Omit<Announcement, 'id' | 'createdAt' | 'sentBy' | 'readBy'>) => {
    if (!user || !firestore || !userProfile) return;

    try {
        await addDoc(collection(firestore, 'announcements'), {
            ...newAnnouncement,
            createdAt: serverTimestamp(),
            sentBy: user.uid,
            readBy: [],
        });
        toast({ title: "Announcement Sent!", description: "Your announcement has been published." });
        logActivity(firestore, {
            userId: user.uid,
            userName: userProfile.displayName || user.email,
            action: 'ANNOUNCEMENT_SENT',
            details: `Sent announcement: "${newAnnouncement.title}"`
        });
    } catch(err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  }, [user, firestore, toast, userProfile]);

  const handleDeleteAnnouncement = useCallback(async (announcementToDelete: Announcement) => {
    if (!firestore || !user || !userProfile) return;
    try {
        await deleteDoc(doc(firestore, 'announcements', announcementToDelete.id));
        toast({ title: 'Announcement Deleted', description: 'The announcement has been removed.' });
        logActivity(firestore, {
            userId: user.uid,
            userName: userProfile.displayName || user.email,
            action: 'ANNOUNCEMENT_DELETE',
            details: `Deleted announcement: "${announcementToDelete.title}"`
        });
    } catch(err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  }, [firestore, toast, user, userProfile]);
  
  if (loading || !isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
          <h1 className={cn("text-3xl font-bold tracking-tight font-headline", isAdmin(user?.email) && "text-primary")}>
            Announcements
          </h1>
        </div>
        <TabsList>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="send" className="mt-4">
        <AnnouncementForm users={users || []} onAddAnnouncement={handleAddAnnouncement} currentUser={user} regions={regions} />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <AnnouncementHistory 
            announcements={announcements || []} 
            onDelete={handleDeleteAnnouncement}
            canDelete={isAuthorized}
        />
      </TabsContent>
    </Tabs>
  );
}
