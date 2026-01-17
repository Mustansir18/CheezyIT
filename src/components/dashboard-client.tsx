'use client';

import { useState, useMemo } from 'react';
import type { Ticket } from '@/lib/data';
import { getStats } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Circle, CircleDot, CircleCheck, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import ChatBot from '@/components/chatbot';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface DashboardClientProps {
  // We will fetch tickets inside this component now
  tickets: never[];
  stats: never;
}

export default function DashboardClient({}: DashboardClientProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const issuesQuery = useMemoFirebase(
    () => 
      user 
        ? query(collection(firestore, 'users', user.uid, 'issues'), orderBy('createdAt', 'desc')) 
        : null,
    [firestore, user]
  );
  const { data: tickets, isLoading: ticketsLoading } = useCollection<Ticket>(issuesQuery);
  const allTickets = tickets || [];

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const [ticketIdFilter, setTicketIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  const availableRegions = useMemo(() => {
    return Array.from(new Set(allTickets.map(t => t.region).filter(Boolean))).sort();
  }, [allTickets]);

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
            (ticket.id && ticket.id.toLowerCase().includes(lowerCaseFilter)) ||
            (ticket.title && ticket.title.toLowerCase().includes(lowerCaseFilter))
        );
    }

    if (statusFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.status === statusFilter);
    }
    
    if (regionFilter !== 'all') {
        tickets = tickets.filter(ticket => ticket.region === regionFilter);
    }

    return tickets;
  }, [allTickets, date, ticketIdFilter, statusFilter, regionFilter]);


  const stats = useMemo(() => getStats(filteredTickets), [filteredTickets]);

  const ticketFilterPopover = (
      <Popover>
          <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                  Ticket
                  <Filter className="ml-2 h-3 w-3" />
              </Button>
          </PopoverTrigger>
          <PopoverContent className="p-2 w-60" align="start">
              <Input
                  placeholder="Filter by ID or title..."
                  value={ticketIdFilter}
                  onChange={(e) => setTicketIdFilter(e.target.value)}
                  className="h-9"
              />
          </PopoverContent>
      </Popover>
  );

  const statusFilterDropdown = (
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                  Status
                  <Filter className="ml-2 h-3 w-3" />
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="In Progress">In Progress</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Resolved">Resolved</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
          </DropdownMenuContent>
      </DropdownMenu>
  );

  const regionFilterDropdown = (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
                Region
                <Filter className="ml-2 h-3 w-3" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={regionFilter} onValueChange={setRegionFilter}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                {availableRegions.map(region => (
                    <DropdownMenuRadioItem key={region} value={region}>
                        {region}
                    </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ticketsLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.pending}</div>}
            <p className="text-xs text-muted-foreground">
              Tickets awaiting response
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <CircleDot className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {ticketsLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.inProgress}</div>}
             <p className="text-xs text-muted-foreground">
              Tickets actively being worked on
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Issues</CardTitle>
            <CircleCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
             {ticketsLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.resolved}</div>}
            <p className="text-xs text-muted-foreground">
              Completed and closed tickets
            </p>
          </CardContent>
        </Card>
      </div>

      <ChatBot />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
            <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                    date.to ? (
                    <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                    </>
                    ) : (
                    format(date.from, "LLL dd, y")
                    )
                ) : (
                    <span>Pick a date</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                />
            </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => setDate({from: startOfDay(new Date()), to: endOfDay(new Date())})}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
            <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>A list of your support tickets. Use the filters to narrow your search.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Mobile Filters */}
            <div className="flex items-center gap-2 mb-4 md:hidden">
              {ticketFilterPopover}
              {statusFilterDropdown}
              {regionFilterDropdown}
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[250px]">
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="-ml-3 h-8">
                                          Ticket
                                          <Filter className="ml-2 h-3 w-3" />
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-2 w-60" align="start">
                                      <Input
                                          placeholder="Filter by ID or title..."
                                          value={ticketIdFilter}
                                          onChange={(e) => setTicketIdFilter(e.target.value)}
                                          className="h-9"
                                      />
                                  </PopoverContent>
                              </Popover>
                          </TableHead>
                          <TableHead>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="-ml-3 h-8">
                                          Status
                                          <Filter className="ml-2 h-3 w-3" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                      <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                                          <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="In Progress">In Progress</DropdownMenuRadioItem>
                                          <DropdownMenuRadioItem value="Resolved">Resolved</DropdownMenuRadioItem>
                                      </DropdownMenuRadioGroup>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableHead>
                          <TableHead>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="-ml-3 h-8">
                                          Region
                                          <Filter className="ml-2 h-3 w-3" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                      <DropdownMenuRadioGroup value={regionFilter} onValueChange={setRegionFilter}>
                                          <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                          <DropdownMenuSeparator />
                                          {availableRegions.map(region => (
                                              <DropdownMenuRadioItem key={region} value={region}>
                                                  {region}
                                              </DropdownMenuRadioItem>
                                          ))}
                                      </DropdownMenuRadioGroup>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Resolved By</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {ticketsLoading ? (
                      <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                          </TableCell>
                      </TableRow>
                      ) : filteredTickets.length > 0 ? (
                      filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}>
                          <TableCell>
                            <div className="font-medium flex items-center gap-2">
                              {ticket.title}
                              {ticket.unreadByUser && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                              </div>
                            <div className="text-sm text-muted-foreground">
                              {ticket.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={ticket.status === 'Pending' ? 'outline' : 'default'}
                              className={cn(
                                {
                                  'bg-green-600 text-white border-transparent hover:bg-green-700': ticket.status === 'Resolved',
                                  'bg-orange-500 text-white border-transparent hover:bg-orange-600': ticket.status === 'In Progress',
                                }
                              )}
                            >
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{ticket.region}</TableCell>
                          <TableCell>{ticket.createdAt ? format(ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt), 'PPp') : 'N/A'}</TableCell>
                          <TableCell>{ticket.completedAt ? format(ticket.completedAt.toDate ? ticket.completedAt.toDate() : new Date(ticket.completedAt), 'PPp') : 'N/A'}</TableCell>
                          <TableCell>{ticket.resolvedByDisplayName || 'N/A'}</TableCell>
                        </TableRow>
                      ))) : (
                      <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                          No tickets found matching your filters.
                          </TableCell>
                      </TableRow>
                      )}
                  </TableBody>
              </Table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden space-y-3">
              {ticketsLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-3 cursor-pointer" onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}>
                      <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold">{ticket.title}</span>
                          <Badge
                            variant={ticket.status === 'Pending' ? 'outline' : 'default'}
                            className={cn('shrink-0',
                              {
                                'bg-green-600 text-white border-transparent hover:bg-green-700': ticket.status === 'Resolved',
                                'bg-orange-500 text-white border-transparent hover:bg-orange-600': ticket.status === 'In Progress',
                              }
                            )}
                          >
                            {ticket.status}
                          </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">ID: {ticket.id}</div>
                      
                      <div className="text-sm mt-2 space-y-1">
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Region:</span>
                              <span>{ticket.region || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span>{ticket.createdAt ? format(ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt), 'PP') : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Completed:</span>
                              <span>{ticket.completedAt ? format(ticket.completedAt.toDate ? ticket.completedAt.toDate() : new Date(ticket.completedAt), 'PP') : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Resolved By:</span>
                              <span>{ticket.resolvedByDisplayName || 'N/A'}</span>
                          </div>
                      </div>

                      {ticket.unreadByUser && (
                          <div className="flex items-center gap-2 mt-2 text-accent text-xs font-semibold">
                              <span className="h-2 w-2 rounded-full bg-accent" />
                              <span>New updates</span>
                          </div>
                      )}
                  </div>
                ))
              ) : (
                <div className="h-24 text-center flex items-center justify-center">
                  <p>No tickets found matching your filters.</p>
                </div>
              )}
            </div>
        </CardContent>
      </Card>
    </>
  );
}
