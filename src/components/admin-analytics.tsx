'use client';

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, type WithId, useUser } from '@/firebase';
import { collection, query, doc, getDocs, collectionGroup } from 'firebase/firestore';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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

export default function AdminAnalytics() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  
  const [allTickets, setAllTickets] = useState<WithId<Ticket>[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isUserRoot = useMemo(() => user && isRoot(user.email), [user]);
  const isUserAdminRole = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
  const isUserSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user || (!isUserRoot && !isUserAdminRole && !isUserSupport)) {
        setTicketsLoading(false);
        return;
      }
      setTicketsLoading(true);

      try {
        let fetchedTickets: WithId<Ticket>[] = [];
        if (isUserRoot || isUserAdminRole) {
          const issuesCollectionGroup = collectionGroup(firestore, 'issues');
          const issuesSnapshot = await getDocs(issuesCollectionGroup);
          fetchedTickets = issuesSnapshot.docs.map(issueDoc => ({ ...(issueDoc.data() as Ticket), id: issueDoc.id } as WithId<Ticket>));
        } else if (isUserSupport) {
          const usersQuery = query(collection(firestore, 'users'));
          const usersSnapshot = await getDocs(usersQuery);
          const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          
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
        console.error("Error fetching tickets for analytics:", error);
        toast({
            variant: 'destructive',
            title: 'Error Fetching Data',
            description: error.code === 'permission-denied' 
                ? 'You do not have required permissions.'
                : 'Could not fetch ticket data.',
        });
      } finally {
        setTicketsLoading(false);
      }
    };

    if (!userLoading && !profileLoading) {
        fetchTickets();
    }
  }, [user, userLoading, profileLoading, isUserRoot, isUserAdminRole, isUserSupport, firestore, toast]);

  const loading = userLoading || profileLoading || ticketsLoading;

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const { statusData, chartConfig } = useMemo(() => {
    const statusCounts: { [key: string]: number } = { Pending: 0, 'In Progress': 0, Resolved: 0 };

    const chartTickets = allTickets.filter(ticket => {
        if (!date?.from) return true;
        if (!ticket.createdAt) return false;
        const ticketDate = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        if (!date.to) return ticketDate >= date.from;
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        return ticketDate >= date.from && ticketDate <= toDate;
    });

    for (const ticket of chartTickets) {
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
  }, [allTickets, date]);
  
  if (loading) {
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
          <div className="grid gap-6 sm:grid-cols-1">
              <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-2 text-center">Tickets by Status</h3>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px] max-w-sm">
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
