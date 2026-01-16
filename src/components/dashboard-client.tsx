
'use client';

import { useState, useTransition, useMemo } from 'react';
import type { Ticket, TicketStatus } from '@/lib/data';
import { summarizeTicketsAction } from '@/lib/actions';
import { getStats } from '@/lib/data';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Loader2, Circle, CircleDot, CircleCheck, ArrowDown, Minus, TriangleAlert, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


type Stats = {
  pending: number;
  resolved: number;
  inProgress: number;
};

interface DashboardClientProps {
  // We will fetch tickets inside this component now
  tickets: never[];
  stats: never;
}

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  Pending: <Circle className="mr-2 h-4 w-4 text-muted-foreground" />,
  'In Progress': <CircleDot className="mr-2 h-4 w-4 text-accent" />,
  Resolved: <CircleCheck className="mr-2 h-4 w-4 text-chart-2" />,
};

const priorityIcons: Record<Ticket['priority'], React.ReactNode> = {
  Low: <ArrowDown className="mr-2 h-4 w-4 text-muted-foreground" />,
  Medium: <Minus className="mr-2 h-4 w-4 text-accent" />,
  High: <TriangleAlert className="mr-2 h-4 w-4 text-destructive" />,
};

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

  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const filteredByDateTickets = useMemo(() => {
    if (!date?.from) return allTickets;
    return allTickets.filter(ticket => {
        if (!ticket.createdAt) return false;
        const ticketDate = ticket.createdAt.toDate();
        if (!date.to) return ticketDate >= date.from;
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);
        return ticketDate >= date.from && ticketDate <= toDate;
    });
  }, [allTickets, date]);

  const stats = useMemo(() => getStats(filteredByDateTickets), [filteredByDateTickets]);

  const handleSummarize = () => {
    startTransition(async () => {
      const openTickets = filteredByDateTickets.filter(t => t.status !== 'Resolved');
      const ticketsForAI = openTickets.map(({id: ticketId, title, description, status, priority}) => ({
          ticketId,
          title,
          description,
          status,
          priority
      }));

      const result = await summarizeTicketsAction(ticketsForAI);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: result.error,
        });
      } else if (result.summary) {
        setSummary(result.summary);
      }
    });
  };

  const filteredTickets = useMemo(() => {
    return {
      all: filteredByDateTickets,
      pending: filteredByDateTickets.filter(t => t.status === 'Pending'),
      resolved: filteredByDateTickets.filter(t => t.status === 'Resolved'),
    };
  }, [filteredByDateTickets]);

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
            <CircleCheck className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
             {ticketsLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.resolved}</div>}
            <p className="text-xs text-muted-foreground">
              Completed and closed tickets
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Lightbulb className="h-5 w-5 text-accent" />
               <CardTitle>Smart Summary</CardTitle>
            </div>
            <Button onClick={handleSummarize} disabled={isPending || ticketsLoading}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Summary
            </Button>
          </div>
          <CardDescription>Get an AI-powered summary of your open tickets.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && (
             <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
             </div>
          )}
          {summary && !isPending && <p className="text-sm text-muted-foreground">{summary}</p>}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="all">
        <div className="flex justify-between items-center mb-4">
            <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-[300px] justify-start text-left font-normal",
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
                    <span>Pick a date range</span>
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
        {(['all', 'pending', 'resolved'] as const).map(tab => (
           <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{tab} Tickets</CardTitle>
                <CardDescription>
                  A list of your {tab} support tickets within the selected date range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketsLoading ? (
                      <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                          </TableCell>
                      </TableRow>
                    ) : filteredTickets[tab].length > 0 ? (
                      filteredTickets[tab].map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/ticket/${ticket.id}`)}>
                        <TableCell>
                           <div className="font-medium flex items-center gap-2">
                            {ticket.title}
                            {ticket.unreadByUser && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                           </div>
                           <div className="hidden text-sm text-muted-foreground md:inline">
                            {ticket.id}
                           </div>
                        </TableCell>
                        <TableCell>
                           <Badge variant={ticket.status === 'Resolved' ? 'default' : 'outline'} className={cn(
                             ticket.status === 'Resolved' && 'bg-chart-2 hover:bg-chart-2/80 text-white',
                             ticket.status === 'In Progress' && 'text-accent border-accent'
                           )}>
                             {ticket.status}
                           </Badge>
                        </TableCell>
                        <TableCell className="flex items-center">
                          {priorityIcons[ticket.priority]}
                          {ticket.priority}
                        </TableCell>
                        <TableCell>{ticket.createdAt ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No tickets found in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
