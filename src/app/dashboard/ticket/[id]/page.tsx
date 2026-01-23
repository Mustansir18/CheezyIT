'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import TicketChat from '@/components/ticket-chat';
import TicketDetailView from '@/components/ticket-detail-view';
import type { Ticket, TicketStatus } from '@/lib/data';
import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const mockTicket: Ticket = {
    id: 'mock-ticket-1',
    userId: 'demo-user-id',
    ticketId: 'TKT-000001',
    title: 'Cannot connect to Wi-Fi',
    description: 'My laptop is not connecting to the office Wi-Fi. I have tried restarting it but it did not work. Please help.',
    status: 'In-Progress',
    assignedTo: 'support-user-id',
    assignedToDisplayName: 'Support Person',
    createdAt: new Date(),
    updatedAt: new Date(),
    issueType: 'Network',
    region: 'Main Office',
};

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const ticketId = params.id as string;
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [view, setView] = useState<'detail' | 'chat'>('detail');
    const [ticket, setTicket] = useState<Ticket & {id: string}>(mockTicket);

    const isOwner = true;
    const canManageTicket = false;
    const backLink = '/dashboard';

    const handleStatusChange = (newStatus: TicketStatus) => {
        setTicket(t => ({...t, status: newStatus}));
        toast({ title: 'Status Updated (Mock)', description: `Ticket status changed to ${newStatus}` });
    };
    
    const handleDeleteTicket = () => {
        setIsDeleteDialogOpen(false);
        toast({ title: 'Ticket Deleted (Mock)', description: 'The ticket has been successfully deleted.' });
        router.push(backLink);
    };

    if (!ticket) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-semibold">Ticket not found</h2>
                <p className="text-muted-foreground">This ticket may have been deleted.</p>
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
                    ticketOwnerProfile={{displayName: 'Demo User'}}
                    canManageTicket={canManageTicket} 
                    isOwner={isOwner}
                    backLink={backLink}
                    assignableUsers={[]}
                    onStatusChange={handleStatusChange}
                    onAssignmentChange={() => {}}
                    onDeleteClick={() => setIsDeleteDialogOpen(true)}
                    onReopenTicket={() => handleStatusChange('In-Progress')}
                    onTakeOwnership={() => {}}
                    onReturnToQueue={() => {}}
                    onBackToDetail={() => setView('detail')}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col min-h-0">
            <TicketDetailView
                ticket={ticket}
                ticketOwnerProfile={{displayName: 'Demo User'}}
                assigneeProfile={{displayName: 'Support Person'}}
                canManageTicket={canManageTicket}
                isOwner={isOwner}
                backLink={backLink}
                assignableUsers={[]}
                onStatusChange={handleStatusChange}
                onAssignmentChange={() => {}}
                onDeleteClick={() => setIsDeleteDialogOpen(true)}
                onReopenTicket={() => handleStatusChange('In-Progress')}
                onTakeOwnership={() => {}}
                onReturnToQueue={() => {}}
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
