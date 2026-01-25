'use client';
import ActivityLog from '@/components/activity-log';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { isAdmin } from '@/lib/admins';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


export default function AdminActivityLogPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const userIsAdmin = useMemo(() => {
    if (!user) return false;
    if (isAdmin(user.email)) return true;
    return userProfile?.role === 'Admin';
  }, [user, userProfile]);

  const isAuthorized = useMemo(() => userIsAdmin, [userIsAdmin]);
  const loading = userLoading || profileLoading;

  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push('/admin');
    }
  }, [loading, isAuthorized, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsAdmin && "text-primary")}>
          Activity Log
        </h1>
      </div>
      <ActivityLog />
    </div>
  );
}
