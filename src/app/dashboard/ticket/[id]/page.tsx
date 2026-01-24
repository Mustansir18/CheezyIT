'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import TicketChat from '@/components/ticket-chat';
import TicketDetailView from '@/components/ticket-detail-view';
import type { Ticket, TicketStatus } from '@/lib/data';
import { initialMockTickets } from '@/lib/data';
import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { User } from '@/components/user-management';


export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const ticketId = params.id as string;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [allTickets, setAllTickets] = useState<(Ticket & {id: string})[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [view, setView] = useState<'detail' | 'chat'>('detail');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(() => {
        const userJson = localStorage.getItem('mockUser');
        if (userJson) setCurrentUser(JSON.parse(userJson));

        const usersJson = localStorage.getItem('mockUsers');
        if (usersJson) setUsers(JSON.parse(usersJson));
        
        const ticketsJson = localStorage.getItem('mockTickets');
        if (ticketsJson) {
            setAllTickets(JSON.parse(ticketsJson).map((t: any) => ({
                ...t,
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt),
            })));
        } else {
            localStorage.setItem('mockTickets', JSON.stringify(initialMockTickets));
            setAllTickets(initialMockTickets);
        }
    }, []);

    useEffect(() => {
        loadData();
        setLoading(false);
        const handleStorage = (e: StorageEvent) => {
            if (['mockUser', 'mockUsers', 'mockTickets'].includes(e.key || '')) {
                loadData();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [loadData]);


    const ticket = useMemo(() => allTickets.find(t => t.id === ticketId), [allTickets, ticketId]);
    const ticketOwnerProfile = useMemo(() => users.find(u => u.email === ticket?.userId), [users, ticket]);
    const assigneeProfile = useMemo(() => users.find(u => u.id === ticket?.assignedTo), [users, ticket]);
    const isOwner = useMemo(() => currentUser?.email === ticket?.userId, [currentUser, ticket]);
    const canManageTicket = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'it-support' || currentUser?.role === 'Head', [currentUser]);

    const backLink = useMemo(() => {
        if (!currentUser) return '/';
        if (['Admin', 'Head'].includes(currentUser.role)) return '/admin';
        if (currentUser.role === 'it-support') return '/admin/tickets';
        return '/dashboard';
    }, [currentUser]);

    const assignableUsers = useMemo(() => users.filter(u => u.role === 'Admin' || u.role === 'it-support' || u.role === 'Head'), [users]);


    const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
        const updatedTickets = allTickets.map(t => 
            t.id === ticketId ? { ...t, ...updates, updatedAt: new Date() } : t
        );
        setAllTickets(updatedTickets);
        localStorage.setItem('mockTickets', JSON.stringify(updatedTickets));
    };

    const handleStatusChange = (newStatus: TicketStatus) => {
        if (!ticket) return;
        const updates: Partial<Ticket> = { status: newStatus };
        if (newStatus === 'Resolved' || newStatus === 'Closed') {
            updates.resolvedBy = currentUser?.id;
            updates.resolvedByDisplayName = currentUser?.displayName;
        }
        updateTicket(ticket.id, updates);
        toast({ title: 'Status Updated', description: `Ticket status changed to ${newStatus}` });
    };

    const handleAssignmentChange = (userId: string) => {
        if (!ticket) return;
        const assignedUser = users.find(u => u.id === userId);
        updateTicket(ticket.id, {
            assignedTo: userId || undefined,
            assignedToDisplayName: assignedUser?.displayName || undefined,
        });
        toast({ title: 'Assignment Updated', description: `Ticket assigned to ${assignedUser?.displayName || 'Unassigned'}` });
    };

    const handleDeleteTicket = () => {
        const updatedTickets = allTickets.filter(t => t.id !== ticketId);
        setAllTickets(updatedTickets);
        localStorage.setItem('mockTickets', JSON.stringify(updatedTickets));
        setIsDeleteDialogOpen(false);
        toast({ title: 'Ticket Deleted', description: 'The ticket has been successfully deleted.' });
        router.push(backLink);
    };

    const handleTakeOwnership = () => {
        if (!currentUser) return;
        handleAssignmentChange(currentUser.id);
    };

    const handleReturnToQueue = () => {
        handleAssignmentChange('');
    };
    
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
                    ticketOwnerProfile={ticketOwnerProfile}
                    canManageTicket={canManageTicket} 
                    isOwner={isOwner}
                    backLink={backLink}
                    assignableUsers={assignableUsers}
                    onStatusChange={handleStatusChange}
                    onAssignmentChange={handleAssignmentChange}
                    onDeleteClick={() => setIsDeleteDialogOpen(true)}
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
                assignableUsers={assignableUsers}
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
