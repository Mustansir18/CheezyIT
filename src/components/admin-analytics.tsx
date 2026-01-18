
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, XAxis, YAxis, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, subMonths, formatDistanceStrict, intervalToDuration, formatDuration } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase, type WithId, useUser } from '@/firebase';
import { collection, query, doc, getDocs, collectionGroup } from 'firebase/firestore';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Ticket } from '@/lib/data';
import { isRoot } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportData } from '@/lib/export';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type UserProfile = {
  role: string;
  regions?: string[];
}

type User = {
    id: string;
    displayName: string;
    role: 'User' | 'it-support' | 'Admin';
};


function ExportButtons({ title, columns, data }: { title: string, columns: string[], data: any[][] }) {
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();

    const handleExport = async (format: 'pdf' | 'excel') => {
        setExporting(true);
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button disabled={exporting} size="sm" variant="outline">
                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Download
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>As PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>As Excel</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const getResolutionTime = (createdAt: any, completedAt: any): {time: string, minutes: number} => {
    if (!completedAt || !createdAt) return { time: 'N/A', minutes: 0 };
    try {
        const createdDate = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
        const completedDate = completedAt?.toDate ? completedAt.toDate() : new Date(completedAt);
        if (isNaN(createdDate.getTime()) || isNaN(completedDate.getTime())) {
            return { time: 'Invalid Date', minutes: 0 };
        }
        const minutes = (completedDate.getTime() - createdDate.getTime()) / (1000 * 60);
        return { time: formatDistanceStrict(completedDate, createdDate), minutes };
    } catch (e) {
        console.error("Error calculating resolution time:", e);
        return { time: 'Error', minutes: 0 };
    }
};

const calculateAverageResolutionTime = (tickets: WithId<Ticket>[]) => {
    const resolvedWithTime = tickets.filter(t => t.status === 'Resolved' && t.completedAt && t.createdAt);
    if (resolvedWithTime.length === 0) return 'N/A';

    const totalMinutes = resolvedWithTime.reduce((acc, ticket) => {
        return acc + getResolutionTime(ticket.createdAt, ticket.completedAt).minutes;
    }, 0);

    const averageMinutes = totalMinutes / resolvedWithTime.length;
    
    if (averageMinutes < 1) return 'less than a minute';

    const duration = intervalToDuration({ start: 0, end: averageMinutes * 60 * 1000 });
    return formatDuration(duration, { format: ['days', 'hours', 'minutes'] }) || 'less than a minute';
}


export default function AdminAnalytics() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  
  const [allTickets, setAllTickets] = useState<WithId<Ticket>[]>([]);
  const [allUsers, setAllUsers] = useState<WithId<User>[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isUserRoot = useMemo(() => user && isRoot(user.email), [user]);
  const isUserAdminRole = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
  const isUserSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchTicketsAndUsers = async () => {
      if (!user || (!isUserRoot && !isUserAdminRole && !isUserSupport)) {
        setTicketsLoading(false);
        return;
      }
      setTicketsLoading(true);

      try {
        // Fetch Users
        const usersQuery = query(collection(firestore, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(docSnap => ({ ...(docSnap.data()), id: docSnap.id })) as WithId<User>[];
        setAllUsers(usersData);

        // Fetch Tickets
        let fetchedTickets: WithId<Ticket>[] = [];
        // Admin, Root, and IT Support will all use the more efficient collectionGroup query.
        if (isUserRoot || isUserAdminRole || isUserSupport) {
            const issuesCollectionGroup = collectionGroup(firestore, 'issues');
            const issuesSnapshot = await getDocs(issuesCollectionGroup);
            fetchedTickets = issuesSnapshot.docs.map(issueDoc => ({ ...(issueDoc.data() as Ticket), id: issueDoc.id } as WithId<Ticket>));
        }
        setAllTickets(fetchedTickets);
      } catch (error: any) {
        console.error("Error fetching data for analytics:", error);
        toast({
            variant: 'destructive',
            title: 'Error Fetching Data',
            description: error.code === 'permission-denied' 
                ? 'You do not have required permissions.'
                : 'Could not fetch analytics data.',
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

  const userRolesMap = useMemo(() => {
    return allUsers.reduce((acc, user) => {
        acc[user.id] = user.role;
        return acc;
    }, {} as Record<string, 'User' | 'it-support' | 'Admin'>);
  }, [allUsers]);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

    // Filter by region for non-root admins/support
    if (!isUserRoot && (isUserAdminRole || isUserSupport)) {
        const userRegions = userProfile?.regions || [];
        if (!userRegions.includes('all')) {
            tickets = tickets.filter(ticket => ticket.region && userRegions.includes(ticket.region));
        }
    }

    return tickets.filter(ticket => {
        if (!date?.from) return true;
        if (!ticket.createdAt) return false;
        const ticketDate = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        if (!date.to) return ticketDate >= date.from;
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        return ticketDate >= date.from && ticketDate <= toDate;
    });
  }, [allTickets, date, isUserRoot, isUserAdminRole, isUserSupport, userProfile]);

  const userCreatedTickets = useMemo(() => {
    return filteredTickets.filter(ticket => userRolesMap[ticket.userId] === 'User' || userRolesMap[ticket.userId] === 'Branch');
  }, [filteredTickets, userRolesMap]);

  const resolvedSupportTickets = useMemo(() => {
    return filteredTickets.filter(ticket => ticket.status === 'Resolved' && ticket.resolvedBy && (userRolesMap[ticket.resolvedBy] === 'Admin' || userRolesMap[ticket.resolvedBy] === 'it-support'));
  }, [filteredTickets, userRolesMap]);

  const averageResolutionTime = useMemo(() => calculateAverageResolutionTime(resolvedSupportTickets), [resolvedSupportTickets]);

  const regionData = useMemo(() => {
    const regionCounts = filteredTickets.reduce((acc, ticket) => {
        if (ticket.region) {
            acc[ticket.region] = (acc[ticket.region] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(regionCounts)
        .map(([region, tickets]) => ({ region, tickets }))
        .sort((a, b) => b.tickets - a.tickets);
  }, [filteredTickets]);

  const userCreatedData = useMemo(() => {
    const counts = userCreatedTickets.reduce((acc, ticket) => {
        const userName = usersMap[ticket.userId] || 'Unknown User';
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
  }, [userCreatedTickets, usersMap]);

  const supportResolvedData = useMemo(() => {
    const counts = resolvedSupportTickets.reduce((acc, ticket) => {
        const resolverName = ticket.resolvedByDisplayName || 'N/A';
        if (resolverName !== 'N/A') {
            acc[resolverName] = (acc[resolverName] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
  }, [resolvedSupportTickets]);

  const hourlyData = useMemo(() => {
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, tickets: 0 }));

    filteredTickets.forEach(ticket => {
        if (ticket.createdAt) {
            const ticketDate = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
            const hour = ticketDate.getHours();
            if (hourlyCounts[hour]) {
                hourlyCounts[hour].tickets++;
            }
        }
    });
    
    return hourlyCounts.map(h => ({ ...h, name: `${h.hour}:00` }));

  }, [filteredTickets]);


  if (loading) {
    return (
      <Card className="h-[480px] flex items-center justify-center">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Ticket Reports</CardTitle>
                        <CardDescription>Analyze ticket data for different periods.</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'this_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())}); setActiveDatePreset('this_month'); }}>This Month</Button>
                            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'last_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))}); setActiveDatePreset('last_month'); }}>Last Month</Button>
                        </div>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal sm:w-auto sm:min-w-[240px]",
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
                            numberOfMonths={isMobile ? 1 : 2}
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
        </Card>
      
        <Tabs defaultValue="user_tickets">
            <div className="w-full overflow-x-auto">
                <TabsList>
                    <TabsTrigger value="user_tickets">User Tickets</TabsTrigger>
                    <TabsTrigger value="support_performance">Support Performance</TabsTrigger>
                    <TabsTrigger value="region_report">Region Report</TabsTrigger>
                    <TabsTrigger value="hourly_report">Hourly Report</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="user_tickets">
                 <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <CardTitle>Tickets Created by User</CardTitle>
                                <CardDescription>Total tickets created by each user in the selected period.</CardDescription>
                            </div>
                            {userCreatedData.length > 0 && (
                                <ExportButtons 
                                    title="Tickets Created by User"
                                    columns={['User Name', 'Tickets Created']}
                                    data={userCreatedData.map(item => [item.name, item.count])}
                                />
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User Name</TableHead>
                                    <TableHead className="text-right">Tickets Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userCreatedData.length > 0 ? userCreatedData.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right">{item.count}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">No user-created tickets found for this period.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="support_performance">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Average Resolution Time</CardTitle>
                            <CardDescription>Average time taken by Admin/Support to resolve tickets.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{averageResolutionTime}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle>Tickets Resolved by Agent</CardTitle>
                                    <CardDescription>Total tickets resolved by each agent in the selected period.</CardDescription>
                                </div>
                                {supportResolvedData.length > 0 && (
                                    <ExportButtons
                                        title="Tickets Resolved by Agent"
                                        columns={['Agent Name', 'Tickets Resolved']}
                                        data={supportResolvedData.map(item => [item.name, item.count])}
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agent Name</TableHead>
                                        <TableHead className="text-right">Tickets Resolved</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {supportResolvedData.length > 0 ? supportResolvedData.map(item => (
                                        <TableRow key={item.name}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right">{item.count}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">No resolved tickets found for this period.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle>Resolution Details</CardTitle>
                                    <CardDescription>Details for each ticket resolved by Admin &amp; IT Support.</CardDescription>
                                </div>
                                {resolvedSupportTickets.length > 0 && (
                                    <ExportButtons
                                        title="Ticket Resolution Details"
                                        columns={['Ticket Title', 'Resolved By', 'Original User', 'Resolution Time']}
                                        data={resolvedSupportTickets.map(ticket => [
                                            ticket.title,
                                            ticket.resolvedByDisplayName || 'N/A',
                                            usersMap[ticket.userId] || 'Unknown',
                                            getResolutionTime(ticket.createdAt, ticket.completedAt).time
                                        ])}
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticket Title</TableHead>
                                        <TableHead>Resolved By</TableHead>
                                        <TableHead>Original User</TableHead>
                                        <TableHead>Resolution Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {resolvedSupportTickets.length > 0 ? resolvedSupportTickets.map(ticket => (
                                        <TableRow key={ticket.id}>
                                            <TableCell>{ticket.title}</TableCell>
                                            <TableCell>{ticket.resolvedByDisplayName || 'N/A'}</TableCell>
                                            <TableCell>{usersMap[ticket.userId] || 'Unknown'}</TableCell>
                                            <TableCell>{getResolutionTime(ticket.createdAt, ticket.completedAt).time}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">No resolved tickets found for this period.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="region_report">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <CardTitle>Tickets by Region</CardTitle>
                                <CardDescription>Total number of tickets created per region in the selected period.</CardDescription>
                            </div>
                            {regionData.length > 0 && (
                                <ExportButtons
                                    title="Tickets by Region"
                                    columns={['Region', 'Number of Tickets']}
                                    data={regionData.map(item => [item.region, item.tickets])}
                                />
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {regionData.length > 0 ? (
                            <ChartContainer config={{ tickets: { label: "Tickets", color: "hsl(var(--chart-1))" } }} className="h-[400px] w-full">
                                <BarChart accessibilityLayer data={regionData} layout="vertical" margin={{ left: 10 }}>
                                    <YAxis 
                                        dataKey="region" 
                                        type="category" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10}
                                        className="text-sm"
                                    />
                                    <XAxis dataKey="tickets" type="number" hide />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="tickets" layout="vertical" radius={5}>
                                        {regionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-48 items-center justify-center text-muted-foreground">
                                No tickets with region data found for this period.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="hourly_report">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <CardTitle>Hourly Ticket Volume</CardTitle>
                                <CardDescription>Number of tickets created each hour within the selected date range.</CardDescription>
                            </div>
                            {hourlyData.reduce((acc, curr) => acc + curr.tickets, 0) > 0 && (
                                <ExportButtons
                                    title="Hourly Ticket Volume"
                                    columns={['Hour', 'Number of Tickets']}
                                    data={hourlyData.map(item => [item.name, item.tickets])}
                                />
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hourlyData.reduce((acc, curr) => acc + curr.tickets, 0) > 0 ? (
                            <ChartContainer config={{ tickets: { label: "Tickets", color: "hsl(var(--chart-1))" } }} className="h-[400px] w-full">
                                <LineChart
                                    accessibilityLayer
                                    data={hourlyData}
                                    margin={{
                                        top: 5,
                                        right: 10,
                                        left: 10,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        allowDecimals={false}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="line" />}
                                    />
                                    <Line
                                        dataKey="tickets"
                                        type="monotone"
                                        stroke="hsl(var(--chart-1))"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-48 items-center justify-center text-muted-foreground">
                                No tickets found for this period to show an hourly report.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

    
