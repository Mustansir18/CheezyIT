'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, WithId } from '@/firebase';
import { doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TicketChat from '@/components/ticket-chat';
import type { Ticket, TicketStatus } from '@/lib/data';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { isAdmin } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


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

    const { data: currentUserProfile, isLoading: profileLoading } = useDoc<UserProfile>(
        user ? doc(firestore, 'users', user.uid) : null
    );

    const effectiveUserId = useMemo(() => {
        if (ownerId && user && isAdmin(user.email)) {
            return ownerId;
        }
        return user?.uid;
    }, [ownerId, user]);


    const ticketRef = useMemoFirebase(
        () => (effectiveUserId && ticketId ? doc(firestore, 'users', effectiveUserId, 'issues', ticketId) : null),
        [firestore, effectiveUserId, ticketId]
    );
    const { data: ticket, isLoading: ticketLoading } = useDoc<WithId<Ticket>>(ticketRef);

    const canManageTicket = useMemo(() => {
        if (!user || !currentUserProfile) return false;
        return isAdmin(user.email) || currentUserProfile.role === 'it-support';
    }, [user, currentUserProfile]);

    const isOwner = useMemo(() => {
        if (!user || !effectiveUserId) return false;
        return user.uid === effectiveUserId;
    }, [user, effectiveUserId]);
    
    const backLink = isAdmin(user.email) && ownerId ? '/admin' : '/dashboard';

    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!ticketRef) return;
        try {
            await updateDoc(ticketRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Status Updated', description: `Ticket status changed to ${newStatus}` });
        } catch (error: any) {
            console.error("Failed to update status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status. You may not have permission.' });
        }
    };

    const handleDeleteTicket = async () => {
        if (!ticketRef) return;
        try {
            await deleteDoc(ticketRef);
            toast({ title: 'Ticket Deleted', description: 'The ticket has been successfully deleted.' });
            router.push(backLink);
        } catch (error: any) {
            console.error("Failed to delete ticket:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete ticket. You may not have permission.' });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    if (userLoading || ticketLoading || profileLoading || !effectiveUserId) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
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
        <>
        <div className="grid gap-6">
            <div className="flex items-center gap-4">
                 <Button asChild variant="outline" size="icon" className="h-7 w-7">
                    <Link href={backLink}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Ticket Details
                </h1>
                <div className="ml-auto flex items-center gap-2">
                    {canManageTicket ? (
                        <Select onValueChange={(value) => handleStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="outline">
                            {ticket.status}
                        </Badge>
                    )}
                     {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Ticket</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{ticket.title}</CardTitle>
                    <CardDescription>
                        Priority: <Badge variant={ticket.priority === 'High' ? 'destructive' : 'secondary'}>{ticket.priority}</Badge> | Opened on {ticket.createdAt?.toDate().toLocaleDateString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">{ticket.description}</p>
                </CardContent>
            </Card>
            <TicketChat ticketId={ticketId} userId={effectiveUserId} />
        </div>

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
        </>
    );
}
