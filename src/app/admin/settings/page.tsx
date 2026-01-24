'use client';
import UserManagement from '@/components/user-management';
import SystemSettings from '@/components/system-settings';
import { isAdmin } from '@/lib/admins';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/components/user-management';

const initialRegions = ['Region A', 'Region B', 'Region C'];

const initialUsers: User[] = [
    { id: 'admin-user-id', displayName: 'Admin', email: 'mustansir133@gmail.com', role: 'Admin', regions: ['all'], blockedUntil: null },
    { id: 'head-user-1', displayName: 'Head User', email: 'head@example.com', role: 'Head', regions: ['all'], blockedUntil: null },
    { id: 'support-user-1', displayName: 'Support Person', email: 'support@example.com', role: 'it-support', regions: ['Region A', 'Region B'], blockedUntil: null },
    { id: 'user-1', displayName: 'Demo User', email: 'user@example.com', role: 'User', region: 'Region A', blockedUntil: null },
];

export default function AdminSettingsPage() {
    const [user, setUser] = useState<{email: string; role: string} | null>(null);
    const [loading, setLoading] = useState(true);
    const [regions, setRegions] = useState<string[]>(initialRegions);
    const [users, setUsers] = useState<User[]>(initialUsers);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const userJson = localStorage.getItem('mockUser');
        if(userJson) {
            setUser(JSON.parse(userJson));
        }
        setLoading(false);
    }, []);

  const userIsAdmin = useMemo(() => user?.role === 'Admin', [user]);
  
  const isAuthorized = useMemo(() => {
    if (user?.role === 'Admin') return true;
    return false;
  }, [user]);


  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.push('/admin');
    }
  }, [loading, isAuthorized, router]);

  const handleSaveUser = (data: any) => {
    if (data.id) { // Editing
        setUsers(currentUsers => currentUsers.map(u => u.id === data.id ? { ...u, ...data } : u));
        toast({ title: "User Updated (Mock)", description: `${data.displayName}'s profile has been updated.` });
    } else { // Adding
        const newUser: User = { ...data, id: `mock-user-${Date.now()}` };
        setUsers(currentUsers => [...currentUsers, newUser]);
        toast({ title: "User Added (Mock)", description: `${data.displayName} has been added.` });
    }
  };

  const handleBlockUser = (userToBlock: User) => {
      const isCurrentlyBlocked = userToBlock.blockedUntil && userToBlock.blockedUntil > new Date();
      setUsers(currentUsers => currentUsers.map(u => u.id === userToBlock.id ? { ...u, blockedUntil: isCurrentlyBlocked ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } : u));
      toast({ title: `User ${isCurrentlyBlocked ? 'Unblocked' : 'Blocked'} (Mock)`, description: `${userToBlock.displayName} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.` });
  };
  
   const handleSetRegions = (updater: (prevRegions: string[]) => string[]) => {
    setRegions(updater);
  };

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
          Admin Settings
        </h1>
      </div>
      
      <div className="space-y-8">
        <UserManagement 
            userIsAdminOrRoot={isAuthorized} 
            regions={regions} 
            users={users}
            onSaveUser={handleSaveUser}
            onBlockUser={handleBlockUser}
        />
        {userIsAdmin && (
          <>
            <Separator />
            <div>
                <h2 className="text-2xl font-headline font-bold mb-4">System Settings</h2>
                <SystemSettings regions={regions} setRegions={handleSetRegions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
