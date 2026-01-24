'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { TicketStatus, Ticket } from '@/lib/data';
import { getStats, TICKET_STATUS_LIST } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay, startOfMonth, subMonths, formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Info, Clock, ShieldCheck, ShieldX, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSound } from '@/hooks/use-sound';

const statusConfig: Record<TicketStatus, { icon: React.ElementType, color: string }> = {
    'Open': { icon: Info, color: 'bg-blue-500' },
    'In-Progress': { icon: Loader2, color: 'bg-orange-500' },
    'Resolved': { icon: ShieldCheck, color: 'bg-green-600' },
    'Closed': { icon: ShieldX, color: 'bg-gray-500' }
};

export default function DashboardClient({ tickets, stats }: { tickets: any[], stats: any }) {
  const ticketsLoading = false;

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const [ticketIdFilter, setTicketIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

  const playSound = useSound('/sounds/new-announcement.mp3');
  const ticketsRef = useRef(new Map<string, TicketStatus>());
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
        tickets.forEach(ticket => ticketsRef.current.set(ticket.id, ticket.status));
        isInitialMount.current = false;
        return;
    }

    let statusChanged = false;
    const newTicketIds = new Set();
    
    tickets.forEach(ticket => {
        newTicketIds.add(ticket.id);
        const oldStatus = ticketsRef.current.get(ticket.id);
        if (oldStatus && oldStatus !== ticket.status) {
            statusChanged = true;
        }
        ticketsRef.current.set(ticket.id, ticket.status);
    });

    if (statusChanged) {
        playSound();
    }
    
    // Clean up deleted tickets from the ref map
    for (const oldId of ticketsRef.current.keys()) {
        if (!newTicketIds.has(oldId)) {
            ticketsRef.current.delete(oldId);
        }
    }
    
  }, [tickets, playSound]);

  const filteredTickets = useMemo(() => {
    return tickets
      .filter(ticket => {
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
            if (!inTitle && !inId) return false;
        }

        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;

        return true;
      });
  }, [tickets, date, ticketIdFilter, statusFilter]);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        {TICKET_STATUS_LIST.map(status => (
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
            <CardDescription>A list of your recent support tickets.</CardDescription>
             <div className="flex items-center gap-2 pt-4">
                <Input
                    placeholder="Search by ID or title..."
                    value={ticketIdFilter}
                    onChange={(e) => setTicketIdFilter(e.target.value)}
                    className="h-9 max-w-sm"
                />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Status</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem><DropdownMenuSeparator />
                            {TICKET_STATUS_LIST.filter(s => s !== 'Closed').map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {ticketsLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket: Ticket & {id: string}) => (
                   <Link href={`/dashboard/ticket/${ticket.id}`} key={ticket.id} className="block">
                    <Card className="hover:border-primary transition-colors duration-200">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg leading-tight">{ticket.title}</CardTitle>
                          <Badge className={`${statusConfig[ticket.status].color} text-white hover:${statusConfig[ticket.status].color}`}>{ticket.status}</Badge>
                        </div>
                        <CardDescription>{ticket.ticketId}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Last updated {formatDistanceToNowStrict(new Date(ticket.updatedAt), { addSuffix: true })}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full h-24 flex items-center justify-center text-muted-foreground">
                    No open tickets found.
                </div>
              )}
            </div>
        </CardContent>
      </Card>
    </>
  );
}
