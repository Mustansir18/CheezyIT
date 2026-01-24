'use client';
import UserManagement from '@/components/user-management';
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

const initialUsersData: User[] = [
    { id: 'admin-user-id', displayName: 'Admin', email: 'mustansir133@gmail.com', role: 'Admin', blockedUntil: null },
    { id: 'head-user-1', displayName: 'Head User', email: 'head@example.com', role: 'Head', blockedUntil: null },
    { id: 'support-user-1', displayName: 'Support Person', email: 'support@example.com', role: 'it-support', blockedUntil: null },
    { id: 'user-1', displayName: 'Demo User', email: 'user@example.com', role: 'User', blockedUntil: null },
];

export default function AdminSettingsPage() {
    const [user, setUser] = useState<{email: string; role: string} | null>(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const router = useRouter();
    const { toast } = useToast();

    const loadData = useCallback(() => {
        const userJson = localStorage.getItem('mockUser');
        if(userJson) setUser(JSON.parse(userJson));

        const usersJson = localStorage.getItem('mockUsers');
        if (usersJson) {
            setUsers(JSON.parse(usersJson).map((u: any) => ({
                ...u,
                blockedUntil: u.blockedUntil ? new Date(u.blockedUntil) : null
            })));
        } else {
            localStorage.setItem('mockUsers', JSON.stringify(initialUsersData));
            setUsers(initialUsersData);
        }
    }, []);

    useEffect(() => {
        loadData();
        setLoading(false);
        const handleStorageChange = (event: StorageEvent | CustomEvent) => {
            if (event instanceof StorageEvent) {
                if (['mockUser', 'mockUsers'].includes(event.key || '')) {
                    loadData();
                }
            } else {
                loadData();
            }
        };
        window.addEventListener('storage', handleStorageChange as EventListener);
        window.addEventListener('local-storage-change', handleStorageChange as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange as EventListener);
            window.removeEventListener('local-storage-change', handleStorageChange as EventListener);
        };
    }, [loadData]);


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
    let updatedUsersList: User[];

    if (data.id) { // Editing
        updatedUsersList = users.map(u => u.id === data.id ? { ...u, ...data } : u);
        toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });

    } else { // Adding
        const newUser: any = { ...data, id: `mock-user-${Date.now()}` };
        updatedUsersList = [...users, newUser];
        toast({ title: "User Added", description: `${data.displayName} has been added.` });
    }
      localStorage.setItem('mockUsers', JSON.stringify(updatedUsersList));
      window.dispatchEvent(new Event('local-storage-change'));
  };

  const handleBlockUser = (userToBlock: User) => {
      const isCurrentlyBlocked = userToBlock.blockedUntil && userToBlock.blockedUntil > new Date();
      const updatedUsers = users.map(u => u.id === userToBlock.id ? { ...u, blockedUntil: isCurrentlyBlocked ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } : u);
      localStorage.setItem('mockUsers', JSON.stringify(updatedUsers));
      window.dispatchEvent(new Event('local-storage-change'));
      toast({ title: `User ${isCurrentlyBlocked ? 'Unblocked' : 'Blocked'}`, description: `${userToBlock.displayName} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.` });
  };
  
  const handleDeleteUser = (userToDelete: User) => {
      const updatedUsers = users.filter(u => u.id !== userToDelete.id);
      localStorage.setItem('mockUsers', JSON.stringify(updatedUsers));
      window.dispatchEvent(new Event('local-storage-change'));
      toast({ title: "User Deleted", description: `${userToDelete.displayName} has been permanently deleted.` });
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
            users={users}
            onSaveUser={handleSaveUser}
            onBlockUser={handleBlockUser}
            onDeleteUser={handleDeleteUser}
        />
      </div>
    </div>
  );
}
