'use client';
import AdminAnalytics from '@/components/admin-analytics';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type UserProfile = {
  role?: string;
};

export default function AdminReportsPage() {
  const { user, loading: userLoading } = useUser();
  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAuthorized = useMemo(() => {
    if (!userProfile) return false;
    return userIsRoot || userProfile.role === 'Admin';
  }, [userIsRoot, userProfile]);

  useEffect(() => {
    if (!userLoading && !profileLoading && !isAuthorized) {
      router.push('/admin');
    }
  }, [userLoading, profileLoading, isAuthorized, router]);

  if (userLoading || profileLoading || !isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsRoot && "text-primary")}>
          Reports Dashboard
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
          <AdminAnalytics />
      </div>
    </div>
  );
}
