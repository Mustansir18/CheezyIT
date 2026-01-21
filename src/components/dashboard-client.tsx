
'use client';

import React, { useState, useMemo } from 'react';
import type { Ticket, TicketStatus } from '@/lib/data';
import { getStats } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay, startOfMonth, subMonths, formatDistanceToNowStrict } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Info, Clock, ShieldCheck, ShieldX, Calendar as CalendarIcon, Filter, User, MapPin, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface DashboardClientProps {
  tickets: never[];
  stats: never;
}

const statusConfig: Record<TicketStatus, { icon: React.ElementType, color: string }> = {
    'Open': { icon: Info, color: 'bg-blue-500' },
    'In-Progress': { icon: Loader2, color: 'bg-orange-500' },
    'Pending': { icon: Clock, color: 'bg-yellow-500' },
    'Resolved': { icon: ShieldCheck, color: 'bg-green-600' },
    'Closed': { icon: ShieldX, color: 'bg-gray-500' }
};

const TicketCard = ({ ticket, onClick }: { ticket: WithId<Ticket>, onClick: () => void }) => {
    const statusInfo = statusConfig[ticket.status];
    const StatusIcon = statusInfo?.icon;

    return (
        <Card className="group flex items-center p-3 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group-hover:border-primary" onClick={onClick}>
            <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                    {ticket.unreadByUser && <span className="h-2.5 w-2.5 rounded-full bg-accent flex-shrink-0" />}
                    <CardTitle className="text-base font-bold leading-tight truncate">{ticket.title}</CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono">{ticket.ticketId}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{ticket.createdAt?.toDate ? formatDistanceToNowStrict(ticket.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                    {ticket.region && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{ticket.region}</span>}
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
            </div>
        </Card>
    )
}

export default function DashboardClient({}: DashboardClientProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const issuesQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'issues'), orderBy('createdAt', 'desc')) : null,
    [firestore, user]
  );
  const { data: tickets, isLoading: ticketsLoading } = useCollection<WithId<Ticket>>(issuesQuery);
  const allTickets = tickets || [];

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const [ticketIdFilter, setTicketIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

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
    if (statusFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.status === statusFilter);
    }

    return tickets;
  }, [allTickets, date, ticketIdFilter, statusFilter]);


  const stats = useMemo(() => getStats(filteredTickets), [filteredTickets]);
  const statusList: TicketStatus[] = ['Open', 'In-Progress', 'Pending', 'Resolved', 'Closed'];


  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
            <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
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
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-4">
        {statusList.map(status => (
            <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{status}</CardTitle>
                    {React.createElement(statusConfig[status].icon, { className: "h-4 w-4 text-muted-foreground" })}
                </CardHeader>
                <CardContent>
                    {ticketsLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats[status.toLowerCase().replace('-', '') as keyof typeof stats]}</div>}
                </CardContent>
            </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>A list of your support tickets. Use the filters to narrow your search.</CardDescription>
             <div className="flex items-center gap-2 pt-4">
                <Input
                    placeholder="Search by ID, title, or description..."
                    value={ticketIdFilter}
                    onChange={(e) => setTicketIdFilter(e.target.value)}
                    className="h-9 max-w-sm"
                />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Status</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem><DropdownMenuSeparator />
                            {statusList.map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {ticketsLoading ? (
                [...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)} />
                ))
              ) : (
                <div className="col-span-full h-24 flex items-center justify-center text-muted-foreground">
                    No tickets found matching your filters.
                </div>
              )}
            </div>
        </CardContent>
      </Card>
    </>
  );
}
