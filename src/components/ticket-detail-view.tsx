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
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Ticket, TicketStatus } from '@/lib/data';
import { TICKET_STATUS_LIST } from '@/lib/data';
import { WithId } from '@/firebase';

const statusConfig: Record<TicketStatus, { color: string }> = {
    'Open': { color: 'bg-blue-500' },
    'In-Progress': { color: 'bg-orange-500' },
    'Pending': { color: 'bg-yellow-500' },
    'Resolved': { color: 'bg-green-600' },
    'Closed': { color: 'bg-gray-500' }
};

export default function TicketDetailView({
  ticket,
  ticketOwnerProfile,
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

    const isLocked = ticket.status === 'Closed';

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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Reported By</p>
                            <p>{ticketOwnerProfile?.displayName}</p>
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
                            <p>{ticket.region}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">AnyDesk ID</p>
                            <p>{ticket.anydesk || 'Not provided'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground">Working on it</p>
                            <p>{ticket.assignedToDisplayName || 'Unassigned'}</p>
                        </div>
                        {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Resolved By</p>
                                <p>{ticket.resolvedByDisplayName || 'N/A'}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between">
                     <div className="flex flex-wrap gap-2">
                         <Button onClick={onChatClick}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Chat
                         </Button>

                        {canManageTicket && !isLocked && (
                            <>
                                {(ticket.status === 'Open' || ticket.status === 'Pending') && !ticket.assignedTo && (
                                    <Button onClick={onTakeOwnership} variant="secondary">
                                        <Check className="mr-2 h-4 w-4" /> Check
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="secondary">
                                            <UserCheck className="mr-2 h-4 w-4" /> Refer
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuRadioGroup value={ticket.assignedTo} onValueChange={onAssignmentChange}>
                                            <DropdownMenuRadioItem value="">Unassigned</DropdownMenuRadioItem>
                                            {assignableUsers.map((u: any) => (
                                                <DropdownMenuRadioItem key={u.id} value={u.id}>{u.displayName}</DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}

                        {isOwner && ticket.status === 'Resolved' && (
                            <>
                                <Button variant="outline" onClick={() => onStatusChange('Closed')}>Confirm as Closed</Button>
                                <Button onClick={onReopenTicket} variant="destructive">No, reopen ticket</Button>
                            </>
                        )}
                    </div>
                     <div className="flex items-center gap-2">
                        {canManageTicket && (
                             <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status} disabled={isLocked}>
                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TICKET_STATUS_LIST.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canManageTicket && ticket.assignedTo && (
                                    <DropdownMenuItem onClick={onReturnToQueue}>
                                        <Users className="mr-2 h-4 w-4" /> Return to Queue
                                    </DropdownMenuItem>
                                )}
                                 <DropdownMenuItem onClick={onDeleteClick} disabled={isLocked} className="text-red-500 focus:text-red-500">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                 </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                </CardFooter>
            </Card>
        </div>
    );
}
