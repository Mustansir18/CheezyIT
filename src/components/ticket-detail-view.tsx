'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  MessageSquare,
  UserCheck,
  Check,
  Users,
  Trash2,
  MoreVertical,
  Copy,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Ticket, TicketStatus } from '@/lib/data';
import { TICKET_STATUS_LIST } from '@/lib/data';
import { WithId } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';
import { useSound } from '@/hooks/use-sound';

const statusConfig: Record<TicketStatus, { color: string }> = {
    'Open': { color: 'bg-blue-500' },
    'In-Progress': { color: 'bg-orange-500' },
    'Resolved': { color: 'bg-green-600' },
    'Closed': { color: 'bg-gray-500' }
};

const WhatsAppIcon = () => (
    <svg
        height="20"
        width="20"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className="text-green-500"
    >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.203 5.076 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
);


export default function TicketDetailView({
  ticket,
  ticketOwnerProfile,
  assigneeProfile,
  canManageTicket,
  isOwner,
  backLink,
  assignableUsers,
  onStatusChange,
  onAssignmentChange,
  onDeleteClick,
  onReopenTicket,
  onTakeOwnership,
  onReturnToQueue,
  onChatClick,
}: {
    ticket: WithId<Ticket>,
    ticketOwnerProfile: any,
    assigneeProfile: any,
    canManageTicket: boolean,
    isOwner: boolean,
    backLink: string,
    assignableUsers: any[],
    onStatusChange: (status: TicketStatus) => void,
    onAssignmentChange: (userId: string) => void,
    onDeleteClick: () => void,
    onReopenTicket: () => void,
    onTakeOwnership: () => void,
    onReturnToQueue: () => void,
    onChatClick: () => void,
}) {

    const { toast } = useToast();
    const isLocked = ticket.status === 'Closed';

    const playSound = useSound('/sounds/new-announcement.mp3');
    const statusRef = useRef(ticket.status);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            statusRef.current = ticket.status;
            isInitialMount.current = false;
            return;
        }

        if (ticket.status !== statusRef.current) {
            playSound();
            statusRef.current = ticket.status;
        }
    }, [ticket.status, playSound]);

    const handleCopyAnyDesk = () => {
        if (!ticket.anydesk) return;
        navigator.clipboard.writeText(ticket.anydesk);
        toast({ title: 'Copied!', description: 'AnyDesk ID copied to clipboard.' });
    };

    const getWhatsAppLink = (phone: string) => {
        if (!phone || phone.length !== 11 || !phone.startsWith('0')) return null;
        return `https://wa.me/92${phone.substring(1)}`;
    }
    
    const ownerWhatsAppLink = getWhatsAppLink(ticketOwnerProfile?.phoneNumber);
    const assigneeWhatsAppLink = getWhatsAppLink(assigneeProfile?.phoneNumber);

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href={backLink}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Ticket Details</h1>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl">{ticket.title}</CardTitle>
                            <CardDescription className="font-mono pt-1">{ticket.ticketId}</CardDescription>
                        </div>
                         <Badge variant="secondary" className={`${statusConfig[ticket.status]?.color || 'bg-gray-500'} text-white`}>{ticket.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>{ticket.description}</p>
                    </div>

                     <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-2 text-sm">
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Reported By</p>
                            <div className="flex items-center gap-2">
                                <p>{ticketOwnerProfile?.displayName}</p>
                                {canManageTicket && ownerWhatsAppLink && (
                                    <Link href={ownerWhatsAppLink} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                                        <WhatsAppIcon />
                                    </Link>
                                )}
                            </div>
                        </div>
                         <div className="space-y-1">
                            <p className="text-muted-foreground">Reported</p>
                            <p>{ticket.createdAt?.toDate ? formatDistanceToNowStrict(ticket.createdAt.toDate(), { addSuffix: true }) : 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Last Updated</p>
                            <p>{ticket.updatedAt?.toDate ? formatDistanceToNowStrict(ticket.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Issue Type</p>
                            <p>{ticket.issueType === 'Other' ? ticket.customIssueType : ticket.issueType}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-muted-foreground">Region</p>
                            <p>{ticket.region || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">AnyDesk ID</p>
                            {ticket.anydesk ? (
                                <div className="flex items-center gap-1">
                                    <p>{ticket.anydesk}</p>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleCopyAnyDesk}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <p>Not provided</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Working on it</p>
                             <div className="flex items-center gap-2">
                                <p>{ticket.assignedToDisplayName || 'Unassigned'}</p>
                                {isOwner && assigneeWhatsAppLink && (
                                    <Link href={assigneeWhatsAppLink} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                                        <WhatsAppIcon />
                                    </Link>
                                )}
                            </div>
                        </div>
                        {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Resolved By</p>
                                <p>{ticket.resolvedByDisplayName || 'N/A'}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-2">
                     <div className="flex w-full sm:w-auto items-stretch sm:items-center gap-2">
                         <Button onClick={onChatClick} className="flex-grow sm:flex-grow-0">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Chat
                         </Button>
                         {canManageTicket && !isLocked && (ticket.status === 'Open') && !ticket.assignedTo && (
                            <Button onClick={onTakeOwnership} variant="secondary" className="flex-grow sm:flex-grow-0">
                                <Check className="mr-2 h-4 w-4" /> Take Ownership
                            </Button>
                        )}
                    </div>

                    <div className="flex w-full sm:w-auto justify-end items-stretch sm:items-center gap-2">
                        {canManageTicket && !isLocked && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="flex-grow sm:flex-grow-0">
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            {ticket.assignedToDisplayName || 'Assign'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuRadioGroup value={ticket.assignedTo} onValueChange={onAssignmentChange}>
                                            <DropdownMenuRadioItem value="">Unassigned</DropdownMenuRadioItem>
                                            {assignableUsers.map((u: any) => (
                                                <DropdownMenuRadioItem key={u.id} value={u.id}>{u.displayName}</DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                                    <SelectTrigger className="w-full sm:w-[160px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TICKET_STATUS_LIST.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isOwner && ticket.status === 'Resolved' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onStatusChange('Closed')}>
                                            Confirm & Close Ticket
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onReopenTicket} className="text-destructive focus:text-destructive">
                                            Re-open Ticket
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {canManageTicket && ticket.assignedTo && !isLocked && (
                                    <DropdownMenuItem onClick={onReturnToQueue}>
                                        <Users className="mr-2 h-4 w-4" /> Return to Queue
                                    </DropdownMenuItem>
                                )}
                                {canManageTicket && (
                                    <DropdownMenuItem onClick={onDeleteClick} disabled={isLocked} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Ticket
                                    </DropdownMenuItem>
                                )}
                                 {/* A message for when no other actions are available */}
                                {!canManageTicket && !(isOwner && ticket.status === 'Resolved') && (
                                    <DropdownMenuItem disabled>No other actions</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
