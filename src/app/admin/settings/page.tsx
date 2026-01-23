'use client';
import UserManagement from '@/components/user-management';
import SystemSettings from '@/components/system-settings';
import { isAdmin } from '@/lib/admins';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function AdminSettingsPage() {
    const [user, setUser] = useState<{email: string; role: string} | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const userJson = localStorage.getItem('mockUser');
        if(userJson) {
            const parsed = JSON.parse(userJson);
             if (isAdmin(parsed.email)) parsed.role = 'Admin';
             else parsed.role = 'it-support';
            setUser(parsed);
        }
        setLoading(false);
    }, []);

  const userIsAdmin = useMemo(() => user && isAdmin(user.email), [user]);
  
  const isAuthorized = useMemo(() => {
    if (userIsAdmin) return true;
    if (user && (user.role === 'Admin' || user.role === 'it-support')) return true;
    return false;
  }, [userIsAdmin, user]);


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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsAdmin && "text-primary")}>
          {userIsAdmin ? 'Admin Settings' : 'User Management'}
        </h1>
      </div>
      
      <div className="space-y-8">
        <UserManagement userIsAdminOrRoot={isAuthorized} />
        {userIsAdmin && (
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
