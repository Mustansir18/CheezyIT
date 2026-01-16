'use client';
import UserManagement from '@/components/user-management';
import { useUser } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
      <div className="flex items-center justify-between space-y-2">
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
