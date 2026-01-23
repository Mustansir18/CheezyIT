'use client';
import AdminAnalytics from '@/components/admin-analytics';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isAdmin } from '@/lib/admins';
import { useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type UserProfile = {
  role?: string;
};

export default function RootReportsPage() {
  const { user, loading: userLoading } = useUser();
  const userIsAdmin = useMemo(() => user && isAdmin(user.email), [user]);
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAuthorized = useMemo(() => {
    if (user && isAdmin(user.email)) return true;
    if (userProfile && (userProfile.role === 'Admin' || userProfile.role === 'it-support')) return true;
    return false;
  }, [user, userProfile]);

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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/root">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsAdmin && "text-primary")}>
          Reports Dashboard
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
          <AdminAnalytics />
      </div>
    </div>
  );
}
