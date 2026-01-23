'use client';
import UserManagement from '@/components/user-management';
import SystemSettings from '@/components/system-settings';
import { useUser } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function RootSettingsPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  // This check is the definitive guard for this page.
  const userIsActuallyRoot = useMemo(() => {
      if (!user || !user.email) return false;
      return isRoot(user.email);
  }, [user]);

  useEffect(() => {
    // Wait until loading is false.
    if (!loading) {
        // If the user is NOT a root user, redirect them away.
        if (!userIsActuallyRoot) {
            router.push('/root');
        }
    }
  }, [user, loading, userIsActuallyRoot, router]);

  // Show a loading screen while checking auth or if the user is not authorized.
  // This prevents any content from flashing before the redirect happens.
  if (loading || !userIsActuallyRoot) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </div>
    );
  }

  // Only root users will reach this point.
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/root">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsActuallyRoot && "text-primary")}>
          Root
        </h1>
      </div>
      
      <div className="space-y-8">
        <UserManagement userIsAdminOrRoot={userIsActuallyRoot} />
        {userIsActuallyRoot && (
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
