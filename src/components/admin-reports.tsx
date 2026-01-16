
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format, formatDistanceStrict } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, type WithId, useUser } from '@/firebase';
import { collection, query, doc, deleteDoc, getDocs, collectionGroup } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Ticket } from '@/lib/data';
import { isAdmin } from '@/lib/admins';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const COLORS = {
  Pending: 'hsl(var(--chart-3))',
  'In Progress': 'hsl(var(--chart-4))',
  Resolved: 'hsl(var(--chart-2))',
  High: 'hsl(var(--destructive))',
  Medium: 'hsl(var(--chart-3))',
  Low: 'hsl(var(--muted-foreground))',
};

type UserProfile = {
  role: string;
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
        // Ensure both dates are valid
        if (isNaN(createdDate.getTime()) || isNaN(completedDate.getTime())) {
            return 'Invalid Date';
        }
        return formatDistanceStrict(completedDate, createdDate);
    } catch (e) {
        console.error("Error calculating resolution time:", e);
        return 'Error';
    }
};

export default function AdminReports() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [allTickets, setAllTickets] = useState<WithId<Ticket>[]>([]);
  const [allUsers, setAllUsers] = useState<WithId<UserWithDisplayName>[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isUserAdmin = useMemo(() => user && isAdmin(user.email), [user]);
  const isUserSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);

  useEffect(() => {
    const fetchTicketsAndUsers = async () => {
      if (!user || (!isUserAdmin && !isUserSupport)) {
        setTicketsLoading(false);
        return;
      }
      setTicketsLoading(true);

      try {
        let fetchedTickets: WithId<Ticket>[] = [];

        // Fetch all users to map userId to displayName
        const usersQuery = query(collection(firestore, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WithId<UserWithDisplayName>[];
        setAllUsers(usersData);

        if (isUserAdmin) {
          // For Admins, use a collection group query for maximum efficiency.
          const issuesCollectionGroup = collectionGroup(firestore, 'issues');
          const issuesSnapshot = await getDocs(issuesCollectionGroup);
          fetchedTickets = issuesSnapshot.docs.map(issueDoc => {
            return {
              ...(issueDoc.data() as Ticket),
              id: issueDoc.id,
            } as WithId<Ticket>;
          });
        } else if (isUserSupport) {
          // For IT Support, fetch issues for each user.
          const ticketPromises = usersData.map(async (userDoc) => {
            const ownerId = userDoc.id;
            const issuesCollection = collection(firestore, 'users', ownerId, 'issues');
            const issuesSnapshot = await getDocs(issuesCollection);
            return issuesSnapshot.docs.map(issueDoc => {
              return {
                ...(issueDoc.data() as Ticket),
                id: issueDoc.id,
              } as WithId<Ticket>;
            });
          });

          const ticketArrays = await Promise.all(ticketPromises);
          fetchedTickets = ticketArrays.flat();
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
  }, [user, userLoading, profileLoading, isUserAdmin, isUserSupport, firestore, toast]);

  const loading = userLoading || profileLoading || ticketsLoading;

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const filteredTickets = useMemo(() => {
    if (!date?.from) return allTickets;
    return allTickets.filter(ticket => {
        if (!ticket.createdAt) return false;
        // @ts-ignore
        const ticketDate = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        // If there's no 'to' date, just check if it's after the 'from' date.
        if (!date.to) return ticketDate >= date.from;
        // Include the 'to' date in the range.
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999); // Set to end of day
        return ticketDate >= date.from && ticketDate <= toDate;
    });
  }, [allTickets, date]);

  const usersMap = useMemo(() => {
    return allUsers.reduce((acc, user) => {
        acc[user.id] = user.displayName;
        return acc;
    }, {} as Record<string, string>);
  }, [allUsers]);


  const { statusData, priorityData, chartConfig } = useMemo(() => {
    const statusCounts: { [key: string]: number } = { Pending: 0, 'In Progress': 0, Resolved: 0 };
    const priorityCounts: { [key: string]: number } = { Low: 0, Medium: 0, High: 0 };

    for (const ticket of filteredTickets) {
      if (ticket.status) statusCounts[ticket.status]++;
      if (ticket.priority) priorityCounts[ticket.priority]++;
    }

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value, fill: COLORS[name as keyof typeof COLORS] }));
    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value, fill: COLORS[name as keyof typeof COLORS] }));

    const chartConfig = {
      value: { label: 'Tickets' },
      Pending: { label: 'Pending', color: COLORS.Pending },
      'In Progress': { label: 'In Progress', color: COLORS['In Progress'] },
      Resolved: { label: 'Resolved', color: COLORS.Resolved },
       High: { label: 'High', color: COLORS.High },
       Medium: { label: 'Medium', color: COLORS.Medium },
       Low: { label: 'Low', color: COLORS.Low },
    };

    return { statusData, priorityData, chartConfig };
  }, [filteredTickets]);
  
  const handleTicketClick = (ticket: WithId<Ticket>) => {
    router.push(`/dashboard/ticket/${ticket.id}?ownerId=${ticket.userId}`);
  };

  const handleDeleteAllPending = async () => {
    setIsDeleting(true);
    const pendingTickets = (allTickets || []).filter(t => t.status === 'Pending');
    
    if (pendingTickets.length === 0) {
        toast({ title: 'No pending tickets to delete.' });
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        return;
    }

    const deletePromises = pendingTickets.map(ticket => {
        const ticketRef = doc(firestore, 'users', ticket.userId, 'issues', ticket.id);
        return deleteDoc(ticketRef);
    });

    try {
        await Promise.all(deletePromises);
        toast({ title: 'Success', description: `${pendingTickets.length} pending tickets deleted.` });
        // After deletion, refetch or filter the local state
        setAllTickets(currentTickets => currentTickets.filter(t => t.status !== 'Pending'));
    } catch (error: any) {
        console.error("Failed to delete pending tickets:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete pending tickets.' });
    } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
    }
  };


  if (loading && allTickets.length === 0) {
    return (
      <Card className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Ticket Analytics</CardTitle>
              <CardDescription>An overview of all support tickets in the system.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Pending
                </Button>
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
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-2 text-center">Tickets by Status</h3>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                      <PieChart>
                          <Tooltip content={<ChartTooltipContent hideLabel />} />
                          <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {statusData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                          ))}
                          </Pie>
                          <Legend content={({ payload }) => {
                              return (
                                  <ul className="flex gap-4 justify-center mt-4">
                                  {payload?.map((entry) => (
                                      <li key={`item-${entry.value}`} className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                          <span className="text-sm text-muted-foreground">{entry.value}</span>
                                      </li>
                                  ))}
                                  </ul>
                              )
                          }} />
                      </PieChart>
                  </ChartContainer>
              </div>
               <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-2 text-center">Tickets by Priority</h3>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                      <BarChart data={priorityData} layout="vertical" margin={{ left: 10 }}>
                           <XAxis type="number" hide />
                           <CartesianGrid horizontal={false} />
                           <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent hideLabel />} />
                           <Bar dataKey="value" radius={5}>
                               {priorityData.map((entry) => (
                                   <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                               ))}
                           </Bar>
                           <Legend content={({ payload }) => {
                              return (
                                  <ul className="flex flex-wrap gap-4 justify-center mt-4">
                                  {payload?.map((entry, index) => {
                                    const { value: name, color } = entry;
                                    const { value: count } = (entry.payload as any) || {};

                                    return (
                                       <li key={`item-${name}`} className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                          <span className="text-sm text-muted-foreground">{name} ({count})</span>
                                      </li>
                                    )
                                  })}
                                  </ul>
                              )
                          }} />
                      </BarChart>
                  </ChartContainer>
              </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>A list of all support tickets within the selected date range.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Resolution Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
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
                           <Badge variant={ticket.status === 'Resolved' ? 'default' : 'outline'} className={cn(
                             ticket.status === 'Resolved' && 'bg-chart-2 hover:bg-chart-2/80 text-white',
                             ticket.status === 'In Progress' && 'text-accent border-accent'
                           )}>
                             {ticket.status}
                           </Badge>
                        </TableCell>
                        <TableCell>
                            {ticket.priority}
                        </TableCell>
                        <TableCell>{ticket.createdAt ? format(ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt), 'PP') : 'N/A'}</TableCell>
                        <TableCell>{ticket.completedAt ? format(ticket.completedAt.toDate ? ticket.completedAt.toDate() : new Date(ticket.completedAt), 'PP') : 'N/A'}</TableCell>
                        <TableCell>{getResolutionTime(ticket.createdAt, ticket.completedAt)}</TableCell>
                      </TableRow>
                    ))) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                        No tickets found in this date range.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all tickets with the status "Pending".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllPending} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete All Pending
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
