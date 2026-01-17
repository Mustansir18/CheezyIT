'use client';
import UserManagement from '@/components/user-management';
import { useUser } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isRoot(user.email))) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  if (loading || !user || !isRoot(user.email)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          User & Region Management
        </h1>
      </div>
      <div className="mt-4">
        <UserManagement />
      </div>
    </>
  );
}
