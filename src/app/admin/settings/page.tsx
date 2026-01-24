'use client';
import UserManagement from '@/components/user-management';
import { isAdmin } from '@/lib/admins';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/components/user-management';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';


const regions = ['ISL', 'LHR', 'South', 'SUG'];

export default function AdminSettingsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    
    const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

    const userIsAdmin = useMemo(() => {
        if (!user) return false;
        if (isAdmin(user.email)) return true;
        return userProfile?.role === 'Admin';
    }, [user, userProfile]);
    
    const isAuthorized = useMemo(() => userIsAdmin, [userIsAdmin]);

    const loading = userLoading || profileLoading || usersLoading;

    useEffect(() => {
        if (!loading && !isAuthorized) {
          router.push('/admin');
        }
    }, [loading, isAuthorized, router]);

    const handleSaveUser = useCallback(async (data: any) => {
        if (!firestore) return;
        const userData = {
            displayName: data.displayName,
            email: data.email,
            role: data.role,
            regions: data.regions || [],
        };

        try {
            if (data.id) { // Editing
                const userDocRef = doc(firestore, 'users', data.id);
                await updateDoc(userDocRef, userData);
                toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
            } else { // Adding
                // In a real app you'd use Firebase Auth to create a user, then create the doc.
                // Here we just add the doc. You'd need to set a password separately.
                // This is a simplified approach for demonstration.
                await addDoc(collection(firestore, 'users'), userData);
                toast({ title: "User Added", description: `${data.displayName} has been added.` });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    }, [firestore, toast]);

    const handleBlockUser = useCallback(async (userToBlock: User) => {
        if (!firestore) return;
        const isCurrentlyBlocked = userToBlock.blockedUntil && userToBlock.blockedUntil > new Date();
        const userDocRef = doc(firestore, 'users', userToBlock.id);
        
        try {
            await updateDoc(userDocRef, {
                blockedUntil: isCurrentlyBlocked ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            });
            toast({ title: `User ${isCurrentlyBlocked ? 'Unblocked' : 'Blocked'}`, description: `${userToBlock.displayName} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    }, [firestore, toast]);
  
    const handleDeleteUser = useCallback(async (userToDelete: User) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userToDelete.id);
        try {
            await deleteDoc(userDocRef);
            toast({ title: "User Deleted", description: `${userToDelete.displayName} has been permanently deleted.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    }, [firestore, toast]);


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
                    users={users || []}
                    onSaveUser={handleSaveUser}
                    onBlockUser={handleBlockUser}
                    onDeleteUser={handleDeleteUser}
                    regions={regions}
                />
            </div>
        </div>
    );
}
