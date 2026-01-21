'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, type WithId, FirestorePermissionError, errorEmitter, useCollection } from '@/firebase';
import { doc, serverTimestamp, updateDoc, deleteDoc, deleteField, addDoc, collection } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import TicketChat from '@/components/ticket-chat';
import TicketDetailView from '@/components/ticket-detail-view';
import type { Ticket, TicketStatus } from '@/lib/data';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { isRoot } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSound } from '@/hooks/use-sound';


type UserProfile = {
    role: string;
}

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const playInProgressSound = useSound('/sounds/new-message.mp3');
    const playResolvedSound = useSound('/sounds/new-ticket.mp3');
    const playClosedSound = useSound('/sounds/new-announcement.mp3');

    const ticketId = params.id as string;
    const ownerId = searchParams.get('ownerId');

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [view, setView] = useState<'detail' | 'chat'>('detail');

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

    // Fetch ticket owner profile
    const ticketOwnerProfileRef = useMemoFirebase(
        () => (effectiveUserId ? doc(firestore, 'users', effectiveUserId) : null),
        [firestore, effectiveUserId]
    );
    const { data: ticketOwnerProfile, isLoading: ownerProfileLoading } = useDoc<any>(ticketOwnerProfileRef);
    
    // Fetch all users to find assignable staff
    const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: allUsers, isLoading: usersLoading } = useCollection<WithId<{displayName: string; role: string}>>(usersQuery);

    const assignableUsers = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => u.role === 'Admin' || u.role === 'it-support');
    }, [allUsers]);

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
        if (ticket?.status === 'Closed') {
            toast({ variant: 'destructive', title: 'Ticket is Closed', description: 'Cannot change the status of a closed ticket.' });
            return;
        }
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
                if (newStatus === 'In-Progress') playInProgressSound();
                if (newStatus === 'Resolved') playResolvedSound();
                if (newStatus === 'Closed') playClosedSound();
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
    
    const handleAssignment = (assigneeId: string) => {
        if (ticket?.status === 'Closed') {
            toast({ variant: 'destructive', title: 'Ticket is Closed', description: 'Cannot assign a closed ticket.' });
            return;
        }
        if (!ticketRef || !user) return;
        
        const assignee = allUsers?.find(u => u.id === assigneeId);

        updateDoc(ticketRef, { assignedTo: assigneeId, assignedToDisplayName: assignee?.displayName || 'Unknown' })
            .then(() => {
                toast({ title: 'Ticket Assigned', description: `Ticket assigned to ${assignee?.displayName}` });
                playInProgressSound();
            })
            .catch(async (error: any) => {
              const permissionError = new FirestorePermissionError({ path: ticketRef.path, operation: 'update' });
              errorEmitter.emit('permission-error', permissionError);
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign ticket.' });
          });
    };

    const handleDeleteTicket = () => {
        if (ticket?.status === 'Closed') {
            toast({ variant: 'destructive', title: 'Ticket is Closed', description: 'Cannot delete a closed ticket.' });
            setIsDeleteDialogOpen(false);
            return;
        }
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

    const handleReopenTicket = () => {
        if (!ticketRef || !isOwner) return;

        const updateData = {
            status: 'In-Progress' as TicketStatus,
            updatedAt: serverTimestamp(),
            unreadByAdmin: true,
            unreadByUser: false,
            completedAt: deleteField(),
            resolvedBy: deleteField(),
            resolvedByDisplayName: deleteField(),
        };

        updateDoc(ticketRef, updateData)
            .then(() => {
                toast({ title: 'Ticket Reopened', description: 'Your ticket is now In-Progress.' });
                playInProgressSound();
                
                if(!effectiveUserId || !ticketId) return;
                const messagesColRef = collection(firestore, 'users', effectiveUserId, 'issues', ticketId, 'messages');
                addDoc(messagesColRef, {
                    userId: 'system',
                    displayName: 'System',
                    text: 'Ticket was reopened by the user.',
                    createdAt: serverTimestamp(),
                    isRead: false,
                    type: 'user'
                });
            })
            .catch(async (error: any) => {
                const permissionError = new FirestorePermissionError({
                    path: ticketRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to reopen ticket.' });
            });
    };

    const handleTakeOwnership = () => {
        if (ticket?.status !== 'Open') {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'This ticket is already in progress or closed.' });
            return;
        }
        if (!ticketRef || !user) return;

        const updateData = {
            status: 'In-Progress' as TicketStatus,
            assignedTo: user.uid,
            assignedToDisplayName: user.displayName || 'N/A',
            updatedAt: serverTimestamp(),
        };

        updateDoc(ticketRef, updateData)
            .then(() => {
                toast({ title: 'Ticket Assigned', description: `You have taken ownership of this ticket.` });
                playInProgressSound();
            })
            .catch(async (error: any) => {
              const permissionError = new FirestorePermissionError({
                  path: ticketRef.path,
                  operation: 'update',
                  requestResourceData: updateData
              });
              errorEmitter.emit('permission-error', permissionError);
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to take ownership.' });
          });
    };

    const handleReturnToQueue = () => {
        if (ticket?.status === 'Closed') {
            toast({ variant: 'destructive', title: 'Ticket is Closed', description: 'Cannot modify a closed ticket.' });
            return;
        }
        if (!ticketRef || !canManageTicket) return;

        const updateData = {
            status: 'Open' as TicketStatus,
            updatedAt: serverTimestamp(),
            assignedTo: deleteField(),
            assignedToDisplayName: deleteField(),
        };

        updateDoc(ticketRef, updateData)
            .then(() => {
                toast({ title: 'Ticket Returned', description: 'Ticket returned to the general queue.' });
                router.push('/admin/tickets');
            })
            .catch(async (error: any) => {
              const permissionError = new FirestorePermissionError({
                  path: ticketRef.path,
                  operation: 'update',
                  requestResourceData: updateData,
              });
              errorEmitter.emit('permission-error', permissionError);
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to return ticket to queue.' });
          });
    };

    if (userLoading || ticketLoading || profileLoading || usersLoading || ownerProfileLoading || !effectiveUserId) {
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

    if (view === 'chat') {
        return (
            <div className="flex flex-1 flex-col min-h-0">
                <TicketChat 
                    ticket={ticket}
                    ticketOwnerProfile={ticketOwnerProfile}
                    canManageTicket={canManageTicket} 
                    isOwner={isOwner}
                    backLink={backLink}
                    assignableUsers={assignableUsers}
                    onStatusChange={handleStatusChange}
                    onAssignmentChange={handleAssignment}
                    onDeleteClick={() => setIsDeleteDialogOpen(true)}
                    onReopenTicket={handleReopenTicket}
                    onTakeOwnership={handleTakeOwnership}
                    onReturnToQueue={handleReturnToQueue}
                    onBackToDetail={() => setView('detail')}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col min-h-0">
            <TicketDetailView
                ticket={ticket}
                ticketOwnerProfile={ticketOwnerProfile}
                canManageTicket={canManageTicket}
                isOwner={isOwner}
                backLink={backLink}
                assignableUsers={assignableUsers}
                onStatusChange={handleStatusChange}
                onAssignmentChange={handleAssignment}
                onDeleteClick={() => setIsDeleteDialogOpen(true)}
                onReopenTicket={handleReopenTicket}
                onTakeOwnership={handleTakeOwnership}
                onReturnToQueue={handleReturnToQueue}
                onChatClick={() => setView('chat')}
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
