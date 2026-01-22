'use client';
import UserManagement from '@/components/user-management';
import SystemSettings from '@/components/system-settings';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { doc } from 'firebase/firestore';

type UserProfile = {
  role?: string;
};

export default function AdminSettingsPage() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  const userIsAdmin = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
  
  const isAuthorized = useMemo(() => userIsRoot || userIsAdmin, [userIsRoot, userIsAdmin]);

  useEffect(() => {
    if (!loading && !profileLoading && !isAuthorized) {
      router.push('/admin');
    }
  }, [user, loading, profileLoading, isAuthorized, router]);

  if (loading || profileLoading || !isAuthorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsRoot && "text-primary")}>
          User & System Management
        </h1>
      </div>
      
      <div className="space-y-8">
        <UserManagement userIsAdminOrRoot={isAuthorized} />
        {userIsRoot && (
          <>
            <Separator />
            <div>
                <h2 className="text-2xl font-headline font-bold mb-4">System Settings</h2>
                <SystemSettings />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
