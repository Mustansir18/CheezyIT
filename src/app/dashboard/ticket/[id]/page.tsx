
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, type WithId, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import TicketChat from '@/components/ticket-chat';
import type { Ticket, TicketStatus } from '@/lib/data';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { isRoot } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


type UserProfile = {
    role: string;
}

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const ticketId = params.id as string;
    const ownerId = searchParams.get('ownerId');

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const currentUserProfileRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: currentUserProfile, isLoading: profileLoading } = useDoc<UserProfile>(currentUserProfileRef);

    const canManageTicket = useMemo(() => {
        if (!user) return false;
        if (isRoot(user.email)) return true;
        if (currentUserProfile && (currentUserProfile.role === 'it-support' || currentUserProfile.role === 'Admin')) return true;
        return false;
    }, [user, currentUserProfile]);

    const effectiveUserId = useMemo(() => {
        if (ownerId && canManageTicket) {
            return ownerId;
        }
        return user?.uid;
    }, [ownerId, user, canManageTicket]);


    const ticketRef = useMemoFirebase(
        () => (effectiveUserId && ticketId ? doc(firestore, 'users', effectiveUserId, 'issues', ticketId) : null),
        [firestore, effectiveUserId, ticketId]
    );
    const { data: ticket, isLoading: ticketLoading } = useDoc<WithId<Ticket>>(ticketRef);


    const isOwner = useMemo(() => {
        if (!user || !effectiveUserId) return false;
        return user.uid === effectiveUserId;
    }, [user, effectiveUserId]);
    
    const backLink = canManageTicket && ownerId ? '/admin/tickets' : '/dashboard';

    const handleStatusChange = (newStatus: TicketStatus) => {
        if (!ticketRef || !user) return;
        const updateData: {
            status: TicketStatus;
            updatedAt: any;
            completedAt?: any;
            resolvedBy?: string;
            resolvedByDisplayName?: string;
        } = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        if (newStatus === 'Resolved') {
            updateData.completedAt = serverTimestamp();
            updateData.resolvedBy = user.uid;
            updateData.resolvedByDisplayName = user.displayName || 'N/A';
        }
        
        updateDoc(ticketRef, updateData)
            .then(() => {
                toast({ title: 'Status Updated', description: `Ticket status changed to ${newStatus}` });
            })
            .catch(async (error: any) => {
              const permissionError = new FirestorePermissionError({
                  path: ticketRef.path,
                  operation: 'update',
                  requestResourceData: updateData,
              });
              errorEmitter.emit('permission-error', permissionError);
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status. You may not have permission.' });
          });
    };

    const handleDeleteTicket = () => {
        if (!ticketRef) return;
        setIsDeleteDialogOpen(false);

        deleteDoc(ticketRef)
            .then(() => {
                toast({ title: 'Ticket Deleted', description: 'The ticket has been successfully deleted.' });
                router.push(backLink);
            })
            .catch(async (error: any) => {
                const permissionError = new FirestorePermissionError({
                    path: ticketRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete ticket. You may not have permission.' });
            });
    };

    if (userLoading || ticketLoading || profileLoading || !effectiveUserId) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        router.push('/');
        return null;
    }

    if (!ticket) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-semibold">Ticket not found</h2>
                <p className="text-muted-foreground">This ticket may have been deleted or you may not have permission to view it.</p>
                 <Button asChild variant="outline" className="mt-4">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col min-h-0">
            <TicketChat 
                ticket={ticket} 
                canManageTicket={canManageTicket} 
                isOwner={isOwner}
                backLink={backLink}
                onStatusChange={handleStatusChange}
                onDeleteClick={() => setIsDeleteDialogOpen(true)}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this ticket.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
