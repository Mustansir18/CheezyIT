'use client';
import AnnouncementForm from '@/components/announcement-form';
import AnnouncementHistory from '@/components/announcement-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isAdmin } from '@/lib/admins';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type UserProfile = {
  role?: string;
}

export default function RootAnnouncementsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = null;
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userIsAdmin = useMemo(() => user && isAdmin(user.email), [user]);

  const isAuthorized = useMemo(() => {
    if (userIsAdmin) return true;
    if (userProfile && (userProfile.role === 'Admin' || userProfile.role === 'it-support')) return true;
    return false;
  }, [userIsAdmin, userProfile]);

  useEffect(() => {
    if (!userLoading && !profileLoading && !isAuthorized) {
      router.push('/root');
    }
  }, [userLoading, profileLoading, isAuthorized, router]);

  if (userLoading || profileLoading || !isAuthorized) {
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
            <Link href="/root">
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
        <AnnouncementForm />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <AnnouncementHistory />
      </TabsContent>
    </Tabs>
  );
}
