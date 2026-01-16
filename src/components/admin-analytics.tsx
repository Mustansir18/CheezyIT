'use client';

import { useMemo, useState, useEffect } from 'react';
import { Pie, PieChart, Cell, Legend } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, subMonths, formatDistanceStrict, intervalToDuration, formatDuration } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, type WithId, useUser } from '@/firebase';
import { collection, query, doc, getDocs, collectionGroup } from 'firebase/firestore';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Ticket } from '@/lib/data';
import { isRoot } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';

const COLORS = {
  Pending: 'hsl(var(--chart-3))',
  'In Progress': 'hsl(var(--chart-4))',
  Resolved: 'hsl(var(--chart-2))',
};

type UserProfile = {
  role: string;
}

type User = {
    id: string;
    displayName: string;
    role: 'User' | 'it-support' | 'Admin';
};


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
        // Fetch Users
        const usersQuery = query(collection(firestore, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(docSnap => ({ ...(docSnap.data()), id: docSnap.id })) as WithId<User>[];
        setAllUsers(usersData);

        // Fetch Tickets
        let fetchedTickets: WithId<Ticket>[] = [];
        if (isUserRoot || isUserAdminRole) {
          const issuesCollectionGroup = collectionGroup(firestore, 'issues');
          const issuesSnapshot = await getDocs(issuesCollectionGroup);
          fetchedTickets = issuesSnapshot.docs.map(issueDoc => ({ ...(issueDoc.data() as Ticket), id: issueDoc.id } as WithId<Ticket>));
        } else if (isUserSupport) {
          const ticketPromises = usersData.map(async (userDoc) => {
            const ownerId = userDoc.id;
            const issuesCollection = collection(firestore, 'users', ownerId, 'issues');
            const issuesSnapshot = await getDocs(issuesCollection);
            return issuesSnapshot.docs.map(issueDoc => ({ ...(issueDoc.data() as Ticket), id: issueDoc.id } as WithId<Ticket>));
          });
          const ticketArrays = await Promise.all(ticketPromises);
          fetchedTickets = ticketArrays.flat();
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
  }, [user, userLoading, profileLoading, isUserRoot, isUserAdminRole, isUserSupport, firestore, toast]);

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
    return allTickets.filter(ticket => {
        if (!date?.from) return true;
        if (!ticket.createdAt) return false;
        const ticketDate = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        if (!date.to) return ticketDate >= date.from;
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        return ticketDate >= date.from && ticketDate <= toDate;
    });
  }, [allTickets, date]);


  const { statusData, chartConfig } = useMemo(() => {
    const statusCounts: { [key: string]: number } = { Pending: 0, 'In Progress': 0, Resolved: 0 };
    for (const ticket of filteredTickets) {
      if (ticket.status) statusCounts[ticket.status]++;
    }

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value, fill: COLORS[name as keyof typeof COLORS] }));
    
    const chartConfig = {
      value: { label: 'Tickets' },
      Pending: { label: 'Pending', color: COLORS.Pending },
      'In Progress': { label: 'In Progress', color: COLORS['In Progress'] },
      Resolved: { label: 'Resolved', color: COLORS.Resolved },
    };
    return { statusData, chartConfig };
  }, [filteredTickets]);
  
  const userCreatedTickets = useMemo(() => {
    return filteredTickets.filter(ticket => userRolesMap[ticket.userId] === 'User');
  }, [filteredTickets, userRolesMap]);

  const resolvedSupportTickets = useMemo(() => {
    return filteredTickets.filter(ticket => ticket.status === 'Resolved' && ticket.resolvedBy && (userRolesMap[ticket.resolvedBy] === 'Admin' || userRolesMap[ticket.resolvedBy] === 'it-support'));
  }, [filteredTickets, userRolesMap]);

  const averageResolutionTime = useMemo(() => calculateAverageResolutionTime(resolvedSupportTickets), [resolvedSupportTickets]);

  if (loading) {
    return (
      <Card className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle>Ticket Reports</CardTitle>
                        <CardDescription>Analyze ticket data for different periods.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())})}>This Month</Button>
                            <Button variant="outline" size="sm" onClick={() => setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))})}>Last Month</Button>
                        </div>
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
                            onSelect={setDate}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
        </Card>
      
        <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="user_tickets">User Tickets</TabsTrigger>
                <TabsTrigger value="support_performance">Support Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <Card>
                    <CardHeader>
                        <CardTitle>Tickets by Status</CardTitle>
                        <CardDescription>A summary of all tickets in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px] max-w-sm">
                            <PieChart>
                                <ChartTooltipContent hideLabel />
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {statusData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                                </Pie>
                                <Legend />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="user_tickets">
                 <Card>
                    <CardHeader>
                        <CardTitle>Standard User Tickets</CardTitle>
                        <CardDescription>Tickets created by standard users in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket Title</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Date Created</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userCreatedTickets.length > 0 ? userCreatedTickets.map(ticket => (
                                    <TableRow key={ticket.id}>
                                        <TableCell>{ticket.title}</TableCell>
                                        <TableCell>{usersMap[ticket.userId] || 'Unknown User'}</TableCell>
                                        <TableCell>{ticket.createdAt ? format(ticket.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell>{ticket.status}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No tickets found for this period.</TableCell>
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
                            <CardTitle>Resolved Tickets Report</CardTitle>
                            <CardDescription>Tickets resolved by Admin & IT Support in the selected period.</CardDescription>
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
        </Tabs>
    </div>
  );
}
