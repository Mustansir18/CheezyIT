
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, formatDistanceToNowStrict, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Filter, FileDown, Loader2, MoreHorizontal, ShieldCheck, ShieldX, Info, AlertTriangle, User, Clock, CalendarIcon as DateIcon, MapPin, UserCheck, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase, type WithId, useUser } from '@/firebase';
import { collection, query, doc, getDocs, collectionGroup, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Ticket, TicketStatus } from '@/lib/data';
import { getStats, TICKET_STATUS_LIST } from '@/lib/data';
import { isRoot } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { exportData } from '@/lib/export';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


type UserProfile = {
  role: string;
  regions?: string[];
}

type UserWithDisplayName = {
    id: string;
    displayName: string;
}

const statusConfig: Record<TicketStatus, { icon: React.ElementType, color: string }> = {
    'Open': { icon: Info, color: 'bg-blue-500' },
    'In-Progress': { icon: Loader2, color: 'bg-orange-500' },
    'Resolved': { icon: ShieldCheck, color: 'bg-green-600' },
    'Closed': { icon: ShieldX, color: 'bg-gray-500' }
};

const TicketCard = ({ ticket, user, onCommentClick }: { ticket: WithId<Ticket>, user?: UserWithDisplayName, onCommentClick: (e: React.MouseEvent, ticket: WithId<Ticket>) => void }) => {
    const statusInfo = statusConfig[ticket.status];
    const StatusIcon = statusInfo?.icon;

    return (
        <Link href={`/dashboard/ticket/${ticket.id}?ownerId=${ticket.userId}`} className="block group">
            <Card className="group-hover:shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary flex items-center p-3">
                <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {ticket.unreadByAdmin && <span className="h-2.5 w-2.5 rounded-full bg-accent flex-shrink-0" />}
                        <CardTitle className="text-base font-bold leading-tight truncate">{ticket.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono">{ticket.ticketId}</span>
                        <span className="flex items-center gap-1.5"><User className="h-3 w-3" />{user?.displayName || 'Unknown User'}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{ticket.createdAt?.toDate ? formatDistanceToNowStrict(ticket.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                        {ticket.region && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{ticket.region}</span>}
                        {ticket.assignedToDisplayName && (ticket.status === 'In-Progress') && (
                            <span className="flex items-center gap-1.5"><UserCheck className="h-3 w-3" />Working: {ticket.assignedToDisplayName}</span>
                        )}
                        {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.resolvedByDisplayName && (
                            <span className="flex items-center gap-1.5"><UserCheck className="h-3 w-3" />Resolved by {ticket.resolvedByDisplayName}</span>
                        )}
                    </CardDescription>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    {statusInfo && StatusIcon && (
                        <Badge variant="secondary" className={cn(statusInfo.color, 'text-white gap-1.5')}>
                            <StatusIcon className={cn("h-3.5 w-3.5", ticket.status === 'In-Progress' && 'animate-spin')} />
                            {ticket.status}
                        </Badge>
                    )}
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-accent-foreground relative z-10" onClick={(e) => onCommentClick(e, ticket)}>
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </Link>
    )
}

export default function AdminTicketList() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  const [allTickets, setAllTickets] = useState<WithId<Ticket>[]>([]);
  const [allUsers, setAllUsers] = useState<WithId<UserWithDisplayName>[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  
  const [ticketIdFilter, setTicketIdFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [commentingTicket, setCommentingTicket] = useState<WithId<Ticket> | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isUserRoot = useMemo(() => user && isRoot(user.email), [user]);
  const isUserAdminRole = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
  const isUserSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);

  useEffect(() => {
    const fetchTicketsAndUsers = async () => {
      if (!user || (!isUserRoot && !isUserAdminRole && !isUserSupport)) {
        setTicketsLoading(false);
        return;
      }
      setTicketsLoading(true);

      try {
        let fetchedTickets: WithId<Ticket>[] = [];
        const usersQuery = query(collection(firestore, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WithId<UserWithDisplayName>[];
        setAllUsers(usersData);

        if (isUserRoot || isUserAdminRole || isUserSupport) {
            const issuesCollectionGroup = collectionGroup(firestore, 'issues');
            const issuesSnapshot = await getDocs(issuesCollectionGroup);
            fetchedTickets = issuesSnapshot.docs.map(issueDoc => ({ ...(issueDoc.data() as Ticket), id: issueDoc.id } as WithId<Ticket>));
        }
        
        setAllTickets(fetchedTickets.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      } catch (error: any) {
        console.error("Error fetching tickets for admin/support:", error);
        toast({
            variant: 'destructive',
            title: 'Error Fetching Tickets',
            description: error.code === 'permission-denied' 
                ? 'You do not have the required permissions to view all tickets.'
                : 'Could not fetch all tickets. Please check permissions and console for details.',
        });
      } finally {
        setTicketsLoading(false);
      }
    };

    if (!userLoading && !profileLoading) {
        fetchTicketsAndUsers();
    }
  }, [user, userLoading, profileLoading, isUserRoot, isUserAdminRole, isUserSupport, firestore, toast]);

  const loading = userLoading || profileLoading || ticketsLoading;

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const usersMap = useMemo(() => {
    return allUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, UserWithDisplayName>);
  }, [allUsers]);

  const availableRegions = useMemo(() => {
    return Array.from(new Set(allTickets.map(t => t.region).filter(Boolean))).sort();
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

    if (!isUserRoot && (isUserAdminRole || isUserSupport)) {
        const userRegions = userProfile?.regions || [];
        if (!userRegions.includes('all')) {
            tickets = tickets.filter(ticket => ticket.region && userRegions.includes(ticket.region));
        }
    }
    
    if (date?.from) {
        tickets = tickets.filter(ticket => {
            if (!ticket.createdAt) return false;
            const ticketDate = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
            if (!date.to) return ticketDate >= date.from;
            const toDate = new Date(date.to);
            toDate.setHours(23, 59, 59, 999);
            return ticketDate >= date.from && ticketDate <= toDate;
        });
    }

    if (ticketIdFilter) {
        const lowerCaseFilter = ticketIdFilter.toLowerCase();
        tickets = tickets.filter(ticket =>
            (ticket.ticketId && ticket.ticketId.toLowerCase().includes(lowerCaseFilter)) ||
            (ticket.title && ticket.title.toLowerCase().includes(lowerCaseFilter)) ||
            (ticket.description && ticket.description.toLowerCase().includes(lowerCaseFilter))
        );
    }

    if (userFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.userId === userFilter);
    }
    if (statusFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.status === statusFilter);
    }
    if (regionFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.region === regionFilter);
    }

    return tickets;
  }, [allTickets, date, ticketIdFilter, userFilter, statusFilter, regionFilter, isUserRoot, isUserAdminRole, isUserSupport, userProfile]);

  const stats = useMemo(() => getStats(filteredTickets), [filteredTickets]);
  
  const handleCommentClick = (e: React.MouseEvent, ticket: WithId<Ticket>) => {
    e.preventDefault();
    e.stopPropagation();
    setCommentingTicket(ticket);
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel') => {
    if (filteredTickets.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'There is no data to export.' });
        return;
    }
    setExporting(true);
    const title = "All Tickets Report";
    const columns = ['Ticket ID', 'Title', 'User', 'Status', 'Region', 'Created', 'Completed', 'Resolved By'];
    const data = filteredTickets.map(ticket => [
        ticket.ticketId,
        ticket.title,
        usersMap[ticket.userId]?.displayName || 'Unknown User',
        ticket.status,
        ticket.region || 'N/A',
        ticket.createdAt ? format(ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt), 'PPp') : 'N/A',
        ticket.completedAt ? format(ticket.completedAt.toDate ? ticket.completedAt.toDate() : new Date(ticket.completedAt), 'PPp') : 'N/A',
        ticket.resolvedByDisplayName || 'N/A',
    ]);

    try {
        await exportData(exportFormat, title, columns, data);
    } catch (error) {
        console.error("Export failed", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'There was an error while generating the file.' });
    } finally {
        setExporting(false);
    }
};

const handleSendComment = async () => {
    if (!commentingTicket || !commentText.trim() || !user) return;
    setIsSubmittingComment(true);

    const ticketRef = doc(firestore, 'users', commentingTicket.userId, 'issues', commentingTicket.id);
    const newMessageRef = doc(collection(ticketRef, 'messages'));
    const batch = writeBatch(firestore);

    batch.set(newMessageRef, {
        userId: user.uid,
        displayName: user.displayName || 'Admin',
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        isRead: false,
        type: 'user',
    });

    batch.update(ticketRef, {
        unreadByUser: true,
        updatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        toast({ title: 'Comment Sent', description: 'Your comment has been added to the ticket.' });
        setCommentingTicket(null);
        setCommentText('');
    } catch (error) {
        console.error('Error sending comment:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send comment.' });
    } finally {
        setIsSubmittingComment(false);
    }
};

  if (loading && allTickets.length === 0) {
    return (
      <Card className="h-[480px] flex items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
            <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn( "w-full sm:w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground" )}>
                    <DateIcon className="mr-2 h-4 w-4" />
                    {date?.from ? ( date.to ? ( <> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </> ) : ( format(date.from, "LLL dd, y") ) ) : ( <span>Pick a date</span> )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={(range) => { setDate(range); setActiveDatePreset(null); }} numberOfMonths={2}/>
            </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'today' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfDay(new Date()), to: endOfDay(new Date())}); setActiveDatePreset('today'); }}>Today</Button>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'this_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())}); setActiveDatePreset('this_month'); }}>This Month</Button>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'last_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))}); setActiveDatePreset('last_month'); }}>Last Month</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        {TICKET_STATUS_LIST.map(status => (
            <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{status}</CardTitle>
                    {React.createElement(statusConfig[status].icon, { className: "h-4 w-4 text-muted-foreground" })}
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats[status.toLowerCase().replace('-', '') as keyof typeof stats]}</div>}
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>A list of all support tickets. Use the filters to narrow your search.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button disabled={exporting}>
                                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                Download Report
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExport('pdf')}>As PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('excel')}>As Excel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
             <div className="flex items-center gap-2 mt-4">
                <Input
                    placeholder="Search by ID, title, or description..."
                    value={ticketIdFilter}
                    onChange={(e) => setTicketIdFilter(e.target.value)}
                    className="h-9 max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />User</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={userFilter} onValueChange={setUserFilter}>
                            <DropdownMenuRadioItem value="all">All Users</DropdownMenuRadioItem> <DropdownMenuSeparator />
                            {allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName)).map(user => (<DropdownMenuRadioItem key={user.id} value={user.id}>{user.displayName}</DropdownMenuRadioItem>))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Status</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem><DropdownMenuSeparator />
                            {TICKET_STATUS_LIST.map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Region</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={regionFilter} onValueChange={setRegionFilter}>
                            <DropdownMenuRadioItem value="all">All Regions</DropdownMenuRadioItem><DropdownMenuSeparator />
                            {availableRegions.map(region => (<DropdownMenuRadioItem key={region} value={region}>{region}</DropdownMenuRadioItem>))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {loading ? (
                [...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} user={usersMap[ticket.userId]} onCommentClick={handleCommentClick} />
                ))
              ) : (
                <div className="col-span-full h-24 flex items-center justify-center text-muted-foreground">
                    No tickets found matching your filters.
                </div>
              )}
            </div>
        </CardContent>
      </Card>
      <Dialog open={!!commentingTicket} onOpenChange={(isOpen) => { if (!isOpen) { setCommentingTicket(null); setCommentText(''); } }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Comment to {commentingTicket?.ticketId}</DialogTitle>
                <DialogDescription>
                    This comment will be added to the ticket chat and will be visible to the user.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Type your comment here..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCommentingTicket(null)}>Cancel</Button>
                <Button onClick={handleSendComment} disabled={isSubmittingComment || !commentText.trim()}>
                    {isSubmittingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Comment
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
