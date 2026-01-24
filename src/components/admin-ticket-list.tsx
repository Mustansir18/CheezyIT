'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, formatDistanceToNowStrict } from 'date-fns';
import { Filter, FileDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, getStats, TICKET_STATUS_LIST, initialMockTickets } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSound } from '@/hooks/use-sound';

const statusColors: Record<Ticket['status'], string> = {
    'Open': 'bg-blue-500',
    'In-Progress': 'bg-orange-500',
    'Resolved': 'bg-green-600',
    'Closed': 'bg-gray-500',
};

export default function AdminTicketList() {
  const { toast } = useToast();
  const [allTickets, setAllTickets] = useState<(Ticket & {id: string})[]>([]);
  const [ticketIdFilter, setTicketIdFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const [currentUser, setCurrentUser] = useState<{ email: string; role: string; regions?: string[] } | null>(null);
  
  const playSound = useSound('data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAZGF0YQAhAAAA5u7k7+fn5+bm5ubm5+bn5ubm5+fn6Ofn6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojp6enp6enp6enp6enp6enp6enp6ejo6Ojo6Ojo6Ojo6Ojn5+fn5+fn5ubm5ubm5ubm5ubm5ubm5g==');
  const ticketCountRef = useRef(0);
  const isInitialMount = useRef(true);

  const loadData = useCallback(() => {
    const userJson = localStorage.getItem('mockUser');
    if (userJson) setCurrentUser(JSON.parse(userJson));

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
        if (e.key === 'mockTickets' || e.key === 'mockUser') {
            loadData();
        }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);
  
  useEffect(() => {
    if (isInitialMount.current || loading) {
        ticketCountRef.current = allTickets.length;
        isInitialMount.current = false;
        return;
    }

    if (allTickets.length > ticketCountRef.current) {
        playSound();
    }

    ticketCountRef.current = allTickets.length;
  }, [allTickets, playSound, loading]);

  const uniqueUsers = useMemo(() => ['all', ...Array.from(new Set(allTickets.map(t => t.userId)))], [allTickets]);
  const uniqueRegions = useMemo(() => ['all', ...Array.from(new Set(allTickets.map(t => t.region)))], [allTickets]);

  const filteredTickets = useMemo(() => {
    if (!currentUser) return [];

    let tickets = [...allTickets];

    if (currentUser.role === 'it-support' || currentUser.role === 'Branch') {
      tickets = tickets.filter(ticket => ticket.status !== 'Closed');
    }
    
    if ((currentUser.role === 'it-support' || currentUser.role === 'Head') && currentUser.regions && !currentUser.regions.includes('all')) {
      tickets = tickets.filter(ticket => currentUser.regions!.includes(ticket.region));
    }

    return tickets.filter(ticket => {
        if (date?.from) {
            const ticketDate = new Date(ticket.createdAt);
            const from = startOfDay(date.from);
            const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
            if (ticketDate < from || ticketDate > to) return false;
        }

        if (ticketIdFilter) {
            const searchTerm = ticketIdFilter.toLowerCase();
            const inTitle = ticket.title.toLowerCase().includes(searchTerm);
            const inId = ticket.ticketId.toLowerCase().includes(searchTerm);
            const inDescription = ticket.description?.toLowerCase().includes(searchTerm);
            if (!inTitle && !inId && !inDescription) return false;
        }

        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (userFilter !== 'all' && ticket.userId !== userFilter) return false;
        if (regionFilter !== 'all' && ticket.region !== regionFilter) return false;

        return true;
    });
  }, [allTickets, currentUser, date, ticketIdFilter, statusFilter, regionFilter, userFilter]);

  const stats = useMemo(() => getStats(filteredTickets), [filteredTickets]);

  
  if (loading) {
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats[status.toLowerCase().replace('-', '') as keyof typeof stats]}</div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>View, search, and filter all support tickets.</CardDescription>
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
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />User: {userFilter}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={userFilter} onValueChange={setUserFilter}>
                            {uniqueUsers.map(user => <DropdownMenuRadioItem key={user} value={user}>{user}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Status: {statusFilter}</Button></DropdownMenuTrigger>
                     <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                            <DropdownMenuSeparator />
                            {TICKET_STATUS_LIST.map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Region: {regionFilter}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={regionFilter} onValueChange={setRegionFilter}>
                            {uniqueRegions.map(region => <DropdownMenuRadioItem key={region} value={region}>{region}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Last Updated</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                            <TableCell><Link href={`/dashboard/ticket/${ticket.id}`} className="font-medium text-primary hover:underline">{ticket.ticketId}</Link></TableCell>
                            <TableCell>{ticket.title}</TableCell>
                            <TableCell><Badge className={`${statusColors[ticket.status]} text-white hover:${statusColors[ticket.status]}`}>{ticket.status}</Badge></TableCell>
                            <TableCell>{ticket.region}</TableCell>
                            <TableCell>{formatDistanceToNowStrict(new Date(ticket.updatedAt), { addSuffix: true })}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No tickets found for the selected criteria.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </>
  );
}
