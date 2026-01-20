
'use client';

import { useState, useMemo } from 'react';
import type { Ticket, TicketStatus, TicketPriority } from '@/lib/data';
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
import { Loader2, Info, Clock, ShieldCheck, ShieldX, Calendar as CalendarIcon, Filter, Snowflake, Thermometer, Flame, Bomb, User, MapPin, UserCheck } from 'lucide-react';
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

const priorityConfig: Record<TicketPriority, { icon: React.ElementType, color: string }> = {
    'Low': { icon: Snowflake, color: 'bg-blue-400' },
    'Medium': { icon: Thermometer, color: 'bg-yellow-500' },
    'High': { icon: Flame, color: 'bg-orange-600' },
    'Critical': { icon: Bomb, color: 'bg-red-600' }
};

const TicketCard = ({ ticket, onClick }: { ticket: WithId<Ticket>, onClick: () => void }) => {
    const StatusIcon = statusConfig[ticket.status].icon;
    const priorityInfo = ticket.priority ? priorityConfig[ticket.priority] : undefined;
    const PriorityIcon = priorityInfo?.icon;

    return (
        <Card className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={onClick}>
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-bold leading-tight line-clamp-2">{ticket.title}</CardTitle>
                     {ticket.unreadByUser && <span className="h-3 w-3 rounded-full bg-accent flex-shrink-0 mt-1" />}
                </div>
                <CardDescription className="font-mono text-xs pt-1">{ticket.ticketId}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 text-sm">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" /> 
                    <span>{formatDistanceToNowStrict(ticket.createdAt.toDate(), { addSuffix: true })}</span>
                </div>
                {ticket.region && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{ticket.region}</span>
                    </div>
                )}
                {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.resolvedByDisplayName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCheck className="h-4 w-4" />
                        <span>Resolved by {ticket.resolvedByDisplayName}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-4">
                <Badge variant="secondary" className={cn(statusConfig[ticket.status].color, 'text-white gap-1.5')}>
                    <StatusIcon className={cn("h-3.5 w-3.5", ticket.status === 'In-Progress' && 'animate-spin')} />
                    {ticket.status}
                </Badge>
                {priorityInfo && PriorityIcon && ticket.priority && (
                    <Badge variant="outline" className="gap-1.5 border-dashed">
                        <PriorityIcon className={cn("h-3.5 w-3.5", priorityInfo.color)} />
                        {ticket.priority}
                    </Badge>
                )}
            </CardFooter>
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
  const [priorityFilter, setPriorityFilter] = useState('all');
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
     if (priorityFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.priority === priorityFilter);
    }

    return tickets;
  }, [allTickets, date, ticketIdFilter, statusFilter, priorityFilter]);


  const stats = useMemo(() => getStats(filteredTickets), [filteredTickets]);
  const statusList: TicketStatus[] = ['Open', 'In-Progress', 'Pending', 'Resolved', 'Closed'];
  const priorityList: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];


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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Priority</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={priorityFilter} onValueChange={setPriorityFilter}>
                            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem><DropdownMenuSeparator />
                            {priorityList.map(p => <DropdownMenuRadioItem key={p} value={p}>{p}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ticketsLoading ? (
                [...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
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
