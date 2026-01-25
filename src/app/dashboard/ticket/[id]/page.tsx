'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import TicketChat from '@/components/ticket-chat';
import TicketDetailView from '@/components/ticket-detail-view';
import type { Ticket, TicketStatus, ChatMessage } from '@/lib/data';
import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { User as AppUser } from '@/components/user-management';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc, collection, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { isAdmin } from '@/lib/admins';

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const ticketId = params.id as string;
    
    const { user: currentUser, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const [view, setView] = useState<'detail' | 'chat'>('detail');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Ticket data
    const ticketRef = useMemoFirebase(() => (firestore && ticketId ? doc(firestore, 'tickets', ticketId) : null), [firestore, ticketId]);
    const { data: ticket, isLoading: ticketLoading } = useDoc<Ticket>(ticketRef);

    // Current user profile
    const userProfileRef = useMemoFirebase(() => (currentUser ? doc(firestore, 'users', currentUser.uid) : null), [firestore, currentUser]);
    const { data: currentUserProfile, isLoading: profileLoading } = useDoc<AppUser>(userProfileRef);

    // Ticket owner profile
    const ticketOwnerRef = useMemoFirebase(() => (firestore && ticket?.userId ? doc(firestore, 'users', ticket.userId) : null), [firestore, ticket]);
    const { data: ticketOwnerProfile, isLoading: ownerLoading } = useDoc<AppUser>(ticketOwnerRef);
    
    // Ticket assignee profile
    const assigneeRef = useMemoFirebase(() => (firestore && ticket?.assignedTo ? doc(firestore, 'users', ticket.assignedTo) : null), [firestore, ticket]);
    const { data: assigneeProfile, isLoading: assigneeLoading } = useDoc<AppUser>(assigneeRef);
    
    // All support/admin users for assignment
    const assignableUsersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'users'), where('role', 'in', ['Admin', 'it-support', 'Head'])) : null), [firestore]);
    const { data: assignableUsers, isLoading: assignableUsersLoading } = useCollection<AppUser>(assignableUsersQuery);

    // Ticket messages
    const messagesQuery = useMemoFirebase(() => (ticketRef ? query(collection(ticketRef, 'messages'), orderBy('createdAt', 'asc')) : null), [ticketRef]);
    const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);

    const isOwner = useMemo(() => currentUser?.uid === ticket?.userId, [currentUser, ticket]);
    
    const canManageTicket = useMemo(() => {
        if (!currentUserProfile) return false;
        if (isAdmin(currentUserProfile.email)) return true;
        return ['Admin', 'it-support', 'Head'].includes(currentUserProfile.role);
    }, [currentUserProfile]);

    const backLink = useMemo(() => {
        if (!currentUserProfile) return '/';
        if (['Admin', 'Head'].includes(currentUserProfile.role)) return '/admin/tickets';
        if (currentUserProfile.role === 'it-support') return '/admin/tickets';
        return '/dashboard';
    }, [currentUserProfile]);


    const updateTicket = useCallback(async (updates: Partial<Ticket>) => {
        if (!ticketRef) return;
        try {
            await updateDoc(ticketRef, { ...updates, updatedAt: serverTimestamp() });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error Updating Ticket', description: err.message });
        }
    }, [ticketRef, toast]);

    const handleStatusChange = (newStatus: TicketStatus) => {
        const updates: Partial<Ticket> = { status: newStatus };
        if ((newStatus === 'Resolved' || newStatus === 'Closed') && currentUserProfile) {
            updates.resolvedBy = currentUserProfile.id;
            updates.resolvedByDisplayName = currentUserProfile.displayName;
            updates.completedAt = serverTimestamp();
        }
        updateTicket(updates);
        toast({ title: 'Status Updated', description: `Ticket status changed to ${newStatus}` });
    };

    const handleAssignmentChange = (userId: string) => {
        const assignedUser = assignableUsers?.find(u => u.id === userId);
        updateTicket({
            assignedTo: userId || '', // Use empty string to unassign
            assignedToDisplayName: assignedUser?.displayName || '',
        });
        toast({ title: 'Assignment Updated', description: `Ticket assigned to ${assignedUser?.displayName || 'Unassigned'}` });
    };

    const handleDeleteTicket = async () => {
        if (!ticketRef) return;
        try {
            await deleteDoc(ticketRef);
            setIsDeleteDialogOpen(false);
            toast({ title: 'Ticket Deleted', description: 'The ticket has been successfully deleted.' });
            router.push(backLink);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error Deleting Ticket', description: err.message });
        }
    };
    
    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !currentUserProfile || !ticketRef) return;
        
        const messagesCollectionRef = collection(ticketRef, 'messages');
        try {
            await addDoc(messagesCollectionRef, {
                userId: currentUserProfile.id,
                displayName: currentUserProfile.displayName,
                text: text,
                createdAt: serverTimestamp(),
                isRead: false,
                type: 'user',
            });
            // Also update the ticket's updatedAt timestamp
            await updateDoc(ticketRef, { updatedAt: serverTimestamp() });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error Sending Message', description: err.message });
        }
    };

    const handleTakeOwnership = () => {
        if (!currentUserProfile) return;
        handleAssignmentChange(currentUserProfile.id);
    };

    const handleReturnToQueue = () => {
        handleAssignmentChange('');
    };
    
    const loading = userLoading || ticketLoading || profileLoading || ownerLoading || assigneeLoading || assignableUsersLoading || messagesLoading;
    
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-semibold">Ticket not found</h2>
                <p className="text-muted-foreground">This ticket may have been deleted.</p>
                 <Button asChild variant="outline" className="mt-4">
                    <Link href={backLink}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
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
                    messages={messages || []}
                    currentUser={currentUserProfile}
                    ticketOwnerProfile={ticketOwnerProfile}
                    assigneeProfile={assigneeProfile}
                    canManageTicket={canManageTicket} 
                    isOwner={isOwner}
                    backLink={backLink}
                    assignableUsers={assignableUsers || []}
                    onStatusChange={handleStatusChange}
                    onAssignmentChange={handleAssignmentChange}
                    onDeleteClick={() => setIsDeleteDialogOpen(true)}
                    onSendMessage={handleSendMessage}
                    onReopenTicket={() => handleStatusChange('In-Progress')}
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
                assigneeProfile={assigneeProfile}
                canManageTicket={canManageTicket}
                isOwner={isOwner}
                backLink={backLink}
                assignableUsers={assignableUsers || []}
                onStatusChange={handleStatusChange}
                onAssignmentChange={handleAssignmentChange}
                onDeleteClick={() => setIsDeleteDialogOpen(true)}
                onReopenTicket={() => handleStatusChange('In-Progress')}
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
