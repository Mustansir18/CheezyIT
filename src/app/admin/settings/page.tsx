'use client';
import UserManagement from '@/components/user-management';
import { isAdmin } from '@/lib/admins';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/components/user-management';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { logActivity } from '@/lib/activity-logger';


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
        if (!firestore || !user || !userProfile) return;
        const userData = {
            displayName: data.displayName,
            email: data.email,
            phoneNumber: data.phoneNumber || null,
            role: data.role,
            regions: data.regions || [],
        };

        try {
            if (data.id) { // Editing
                const userDocRef = doc(firestore, 'users', data.id);
                await updateDoc(userDocRef, userData);
                toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
                logActivity(firestore, {
                    userId: user.uid,
                    userName: userProfile.displayName || user.email || 'Admin',
                    action: 'USER_UPDATE',
                    details: `Updated profile for user "${data.displayName}" (${data.email})`
                });
            } else { // Adding
                 if (!data.password) {
                    toast({ variant: 'destructive', title: "Error", description: "Password is required for new users." });
                    return;
                }
                
                // HACK: Use a temporary Firebase app to create a new user without signing out the admin.
                const tempAppName = `user-creation-${Date.now()}`;
                const tempApp = initializeApp(firebaseConfig, tempAppName);
                const tempAuth = getAuth(tempApp);

                try {
                    const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
                    const newUserId = userCredential.user.uid;
                    
                    const userDocRef = doc(firestore, 'users', newUserId);
                    await setDoc(userDocRef, userData);

                    toast({ title: "User Added", description: `${data.displayName} has been added.` });
                    logActivity(firestore, {
                        userId: user.uid,
                        userName: userProfile.displayName || user.email || 'Admin',
                        action: 'USER_CREATE',
                        details: `Created new user "${data.displayName}" (${data.email}) with role ${data.role}`
                    });
                } finally {
                    await deleteApp(tempApp);
                }
            }
        } catch (error: any) {
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use by another account.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please use at least 6 characters.";
            }
            toast({ variant: 'destructive', title: "Error creating user", description: errorMessage });
        }
    }, [firestore, toast, user, userProfile]);

    const handleBlockUser = useCallback(async (userToBlock: User) => {
        if (!firestore || !user || !userProfile) return;
        const blockedUntilDate = userToBlock.blockedUntil ? (userToBlock.blockedUntil as any).toDate() : null;
        const isCurrentlyBlocked = blockedUntilDate && blockedUntilDate > new Date();
        const userDocRef = doc(firestore, 'users', userToBlock.id);
        
        try {
            await updateDoc(userDocRef, {
                blockedUntil: isCurrentlyBlocked ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            });
            toast({ title: `User ${isCurrentlyBlocked ? 'Unblocked' : 'Blocked'}`, description: `${userToBlock.displayName} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.` });
            logActivity(firestore, {
                userId: user.uid,
                userName: userProfile.displayName || user.email || 'Admin',
                action: isCurrentlyBlocked ? 'USER_UNBLOCK' : 'USER_BLOCK',
                details: `${isCurrentlyBlocked ? 'Unblocked' : 'Blocked'} user "${userToBlock.displayName}"`
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    }, [firestore, toast, user, userProfile]);
  
    const handleDeleteUser = useCallback(async (userToDelete: User) => {
        if (!firestore || !user || !userProfile) return;
        // NOTE: This only deletes the user's document in Firestore.
        // The Firebase Auth user will remain. Deleting Auth users requires admin privileges,
        // which is typically done from a secure server environment (e.g., Cloud Function).
        const userDocRef = doc(firestore, 'users', userToDelete.id);
        try {
            await deleteDoc(userDocRef);
            toast({ title: "User Record Deleted", description: `${userToDelete.displayName}'s profile has been deleted from Firestore. The user can still log in.` });
            logActivity(firestore, {
                userId: user.uid,
                userName: userProfile.displayName || user.email || 'Admin',
                action: 'USER_DELETE',
                details: `Deleted user record for "${userToDelete.displayName}"`
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    }, [firestore, toast, user, userProfile]);


    if (loading || !isAuthorized) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
                    isLoading={loading}
                />
            </div>
        </div>
    );
}
