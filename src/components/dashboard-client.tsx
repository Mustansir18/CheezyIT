
'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import type { Ticket, TicketStatus } from '@/lib/data';
import { summarizeTicketsAction } from '@/lib/actions';
import { useMockTickets, getStats } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Loader2, Circle, CircleDot, CircleCheck, ArrowDown, Minus, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const { tickets, loading: ticketsLoading } = useMockTickets();
  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const stats = useMemo(() => getStats(tickets), [tickets]);

  const handleSummarize = () => {
    startTransition(async () => {
      const openTickets = tickets.filter(t => t.status !== 'Resolved');
      const result = await summarizeTicketsAction(openTickets.map(({id: ticketId, ...rest}) => ({...rest, ticketId})));
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
      all: tickets,
      pending: tickets.filter(t => t.status === 'Pending'),
      resolved: tickets.filter(t => t.status === 'Resolved'),
    };
  }, [tickets]);

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
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        {(['all', 'pending', 'resolved'] as const).map(tab => (
           <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{tab} Tickets</CardTitle>
                <CardDescription>
                  A list of your {tab} support tickets.
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
                      <TableRow key={ticket.id}>
                        <TableCell>
                           <div className="font-medium">{ticket.title}</div>
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
                        <TableCell>{ticket.createdAt}</TableCell>
                      </TableRow>
                    ))) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No tickets found.
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
