
'use client';

import { useMemo, useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, formatDistanceStrict, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Filter, Circle, CircleDot, CircleCheck, FileDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase, type WithId, useUser } from '@/firebase';
import { collection, query, doc, getDocs, collectionGroup, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Ticket } from '@/lib/data';
import { getStats } from '@/lib/data';
import { isRoot } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { exportData } from '@/lib/export';


type UserProfile = {
  role: string;
  regions?: string[];
}

type UserWithDisplayName = {
    id: string;
    displayName: string;
}

const getResolutionTime = (createdAt: any, completedAt: any): string => {
    if (!completedAt || !createdAt) return 'N/A';
    try {
        const createdDate = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
        const completedDate = completedAt?.toDate ? completedAt.toDate() : new Date(completedAt);
        if (isNaN(createdDate.getTime()) || isNaN(completedDate.getTime())) {
            return 'Invalid Date';
        }
        return formatDistanceStrict(completedDate, createdDate);
    } catch (e) {
        console.error("Error calculating resolution time:", e);
        return 'Error';
    }
};

export default function AdminTicketList() {
  const firestore = useFirestore();
  const router = useRouter();
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

        // Admin, Root, and IT Support will all use the more efficient collectionGroup query.
        if (isUserRoot || isUserAdminRole || isUserSupport) {
            const issuesCollectionGroup = collectionGroup(firestore, 'issues');
            const issuesSnapshot = await getDocs(issuesCollectionGroup);
            fetchedTickets = issuesSnapshot.docs.map(issueDoc => ({ ...(issueDoc.data() as Ticket), id: issueDoc.id } as WithId<Ticket>));
        }
        
        setAllTickets(fetchedTickets);
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
  }, [user, userLoading, profileLoading, isUserRoot, isUserAdminRole, isUserSupport, firestore]);

  const loading = userLoading || profileLoading || ticketsLoading;

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const usersMap = useMemo(() => {
    return allUsers.reduce((acc, user) => {
        acc[user.id] = user.displayName;
        return acc;
    }, {} as Record<string, string>);
  }, [allUsers]);

  const availableRegions = useMemo(() => {
    return Array.from(new Set(allTickets.map(t => t.region).filter(Boolean))).sort();
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

    // Filter by region for non-root admins/support
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
            ticket.id.toLowerCase().includes(lowerCaseFilter) ||
            (ticket.title && ticket.title.toLowerCase().includes(lowerCaseFilter))
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
  
  const handleTicketClick = async (ticket: WithId<Ticket>) => {
    if (!user) return;

    if (ticket.status === 'Pending' && (isUserAdminRole || isUserRoot || isUserSupport)) {
      const ticketRef = doc(firestore, 'users', ticket.userId, 'issues', ticket.id);
      try {
        await updateDoc(ticketRef, {
          status: 'In Progress',
          updatedAt: serverTimestamp(),
          unreadByAdmin: false,
          unreadByUser: true,
        });
        toast({ title: 'Ticket In Progress', description: "Status updated automatically." });
      } catch (error) {
        console.error("Error updating ticket status:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not update ticket status.',
        });
      }
    }

    router.push(`/dashboard/ticket/${ticket.id}?ownerId=${ticket.userId}`);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (filteredTickets.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Data',
            description: 'There is no data to export.'
        });
        return;
    }
    setExporting(true);
    const title = "All Tickets Report";
    const columns = ['Ticket ID', 'Title', 'User', 'Status', 'Region', 'Created', 'Completed', 'Resolved By'];
    const data = filteredTickets.map(ticket => [
        ticket.id,
        ticket.title,
        usersMap[ticket.userId] || 'Unknown User',
        ticket.status,
        ticket.region || 'N/A',
        ticket.createdAt ? format(ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt), 'PPp') : 'N/A',
        ticket.completedAt ? format(ticket.completedAt.toDate ? ticket.completedAt.toDate() : new Date(ticket.completedAt), 'PPp') : 'N/A',
        ticket.resolvedByDisplayName || 'N/A',
    ]);

    try {
        await exportData(format, title, columns, data);
    } catch (error) {
        console.error("Export failed", error);
        toast({
            variant: 'destructive',
            title: 'Export Failed',
            description: 'There was an error while generating the file.'
        });
    } finally {
        setExporting(false);
    }
};

  const filterControls = (
    <div className="flex items-center gap-2">
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 border-transparent", ticketIdFilter ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
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

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 border-transparent", userFilter !== 'all' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
                    User
                    <Filter className="ml-2 h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup value={userFilter} onValueChange={setUserFilter}>
                    <DropdownMenuRadioItem value="all">All Users</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    {allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName)).map(user => (
                        <DropdownMenuRadioItem key={user.id} value={user.id}>
                            {user.displayName}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 border-transparent", statusFilter !== 'all' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
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
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 border-transparent", regionFilter !== 'all' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
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
    </div>
  );

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
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal",
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
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(range) => { setDate(range); setActiveDatePreset(null); }}
                numberOfMonths={2}
                />
            </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'today' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfDay(new Date()), to: endOfDay(new Date())}); setActiveDatePreset('today'); }}>Today</Button>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'this_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())}); setActiveDatePreset('this_month'); }}>This Month</Button>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'last_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))}); setActiveDatePreset('last_month'); }}>Last Month</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.pending}</div>}
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
            {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.inProgress}</div>}
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
             {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.resolved}</div>}
            <p className="text-xs text-muted-foreground">
              Completed and closed tickets
            </p>
          </CardContent>
        </Card>
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
        </CardHeader>
        <CardContent>
            {/* Mobile Filters */}
            <div className="grid grid-cols-2 gap-2 mb-4 md:hidden">
                {filterControls}
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn("-ml-3 px-3", ticketIdFilter ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
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
                            <TableHead className="w-[180px]">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn("-ml-3 px-3", userFilter !== 'all' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
                                            User
                                            <Filter className="ml-2 h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuRadioGroup value={userFilter} onValueChange={setUserFilter}>
                                            <DropdownMenuRadioItem value="all">All Users</DropdownMenuRadioItem>
                                            <DropdownMenuSeparator />
                                            {allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName)).map(user => (
                                                <DropdownMenuRadioItem key={user.id} value={user.id}>
                                                    {user.displayName}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                            <TableHead>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn("-ml-3 px-3", statusFilter !== 'all' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
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
                                        <Button variant="ghost" size="sm" className={cn("-ml-3 px-3", regionFilter !== 'all' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")}>
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
                        {loading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                <Image src="/logo.png" alt="Loading..." width={60} height={60} className="mx-auto animate-spin" />
                            </TableCell>
                        </TableRow>
                        ) : filteredTickets.length > 0 ? (
                        filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => handleTicketClick(ticket)}>
                            <TableCell>
                            <div className="font-medium flex items-center gap-2">
                                {ticket.title}
                                {ticket.unreadByAdmin && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                                </div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                                {ticket.id}
                            </div>
                            </TableCell>
                            <TableCell>
                            {usersMap[ticket.userId] || 'Unknown User'}
                            </TableCell>
                            <TableCell>
                            <Badge
                                variant={ticket.status === 'Pending' ? 'outline' : 'default'}
                                className={cn(
                                {
                                    'bg-green-600 text-white border-transparent hover:bg-green-600/80': ticket.status === 'Resolved',
                                    'bg-orange-500 text-white border-transparent hover:bg-orange-500/80': ticket.status === 'In Progress',
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
                            <TableCell colSpan={7} className="h-24 text-center">
                            No tickets found matching your filters.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden space-y-3">
              {loading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-3 cursor-pointer" onClick={() => handleTicketClick(ticket)}>
                    <div className="flex justify-between items-start gap-2">
                        <span className="font-medium">{ticket.title}</span>
                        <Badge
                            variant={ticket.status === 'Pending' ? 'outline' : 'default'}
                            className={cn('shrink-0',
                                {
                                'bg-green-600 text-white border-transparent hover:bg-green-600/80': ticket.status === 'Resolved',
                                'bg-orange-500 text-white border-transparent hover:bg-orange-500/80': ticket.status === 'In Progress',
                                }
                            )}
                        >
                            {ticket.status}
                        </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">ID: {ticket.id}</div>
                    
                    <div className="text-sm mt-2 space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">User:</span>
                            <span>{usersMap[ticket.userId] || 'Unknown User'}</span>
                        </div>
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

                    {ticket.unreadByAdmin && (
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
