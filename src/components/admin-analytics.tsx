'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Bar, BarChart, XAxis, YAxis, LineChart, Line, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartTooltip, ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Ticket } from '@/lib/data';
import { initialMockTickets, TICKET_STATUS_LIST } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportData } from '@/lib/export';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function ExportButtons({ title, columns, data }: { title: string, columns: string[], data: any[][] }) {
    const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
    const { toast } = useToast();

    const handleExport = async (format: 'pdf' | 'excel') => {
        setExporting(format);
        try {
            await exportData(format, title, columns, data);
            toast({
                title: 'Export Successful',
                description: `Successfully exported "${title}" as a ${format.toUpperCase()} file.`,
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: `There was an error while exporting the data.`,
            });
            console.error("Export error:", error);
        } finally {
            setExporting(null);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button disabled={!!exporting} size="sm" variant="outline">
                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    {exporting ? `Exporting ${exporting}...` : 'Download'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>As PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>As Excel</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const statusChartConfig = {
    tickets: { label: "Tickets" },
    Open: { label: "Open", color: "hsl(var(--chart-1))" },
    "In-Progress": { label: "In-Progress", color: "hsl(var(--chart-2))" },
    Resolved: { label: "Resolved", color: "hsl(var(--chart-3))" },
    Closed: { label: "Closed", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const dailyChartConfig = {
     tickets: { label: "Tickets", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;


export default function AdminAnalytics() {
  const isMobile = useIsMobile();
  const [allTickets, setAllTickets] = useState<(Ticket & {id: string})[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>('this_month');
  
  const loadData = useCallback(() => {
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
    
    const handleStorage = (e: Event) => {
        if (e instanceof StorageEvent && e.key === 'mockTickets') {
            loadData();
        } else if (!(e instanceof StorageEvent)) {
            loadData();
        }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-change', handleStorage);

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('local-storage-change', handleStorage);
    }
  }, [loadData]);


  const filteredTickets = useMemo(() => {
      if (!date?.from) return [];
      const from = startOfDay(date.from);
      const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
      return allTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= from && ticketDate <= to;
      });
  }, [allTickets, date]);

  const { statusData, dailyData, regionData, assigneeData } = useMemo(() => {
    const statusCounts = TICKET_STATUS_LIST.reduce((acc, status) => ({...acc, [status]: 0}), {} as Record<TicketStatus, number>);
    const dailyCounts: {[key: string]: number} = {};
    const regionCounts: {[key: string]: number} = {};
    const assigneeCounts: {[key: string]: { resolved: number, assigned: number }} = {};

    if (date?.from) {
        const interval = eachDayOfInterval({ start: date.from, end: date.to || date.from });
        interval.forEach(day => {
            dailyCounts[format(day, 'yyyy-MM-dd')] = 0;
        });
    }

    filteredTickets.forEach(ticket => {
        statusCounts[ticket.status]++;
        
        const day = format(new Date(ticket.createdAt), 'yyyy-MM-dd');
        if (dailyCounts[day] !== undefined) {
            dailyCounts[day]++;
        }

        if (ticket.region) {
            regionCounts[ticket.region] = (regionCounts[ticket.region] || 0) + 1;
        }

        if (ticket.assignedToDisplayName) {
            if (!assigneeCounts[ticket.assignedToDisplayName]) {
                assigneeCounts[ticket.assignedToDisplayName] = { resolved: 0, assigned: 0 };
            }
            assigneeCounts[ticket.assignedToDisplayName].assigned++;

            if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
                 assigneeCounts[ticket.assignedToDisplayName].resolved++;
            }
        }
    });

    return {
        statusData: TICKET_STATUS_LIST.map(status => ({ name: status, tickets: statusCounts[status], fill: `var(--color-${status})` })),
        dailyData: Object.entries(dailyCounts).map(([date, count]) => ({ date: format(new Date(date), 'MMM d'), tickets: count })),
        regionData: Object.entries(regionCounts).map(([region, count]) => ({ name: region, tickets: count })),
        assigneeData: Object.entries(assigneeCounts).map(([name, data]) => ({...data, name})).sort((a,b) => b.resolved - a.resolved)
    };
  }, [filteredTickets, date]);


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
                        <CardDescription>Displaying analytics from mocked ticket data.</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'this_month' ? "bg-primary/20 text-primary" : "")} onClick={() => { setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())}); setActiveDatePreset('this_month'); }}>This Month</Button>
                            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'last_month' ? "bg-primary/20 text-primary" : "")} onClick={() => { setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))}); setActiveDatePreset('last_month'); }}>Last Month</Button>
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
      
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="by-region">By Region</TabsTrigger>
                <TabsTrigger value="by-assignee">By Assignee</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4 mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Daily Ticket Volume</CardTitle>
                        <CardDescription>Total number of new tickets created each day.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={dailyChartConfig} className="h-[250px] w-full">
                            <LineChart data={dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line dataKey="tickets" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={true} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tickets by Status</CardTitle>
                        <CardDescription>Breakdown of all tickets by their current status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={statusChartConfig} className="h-[250px] w-full">
                            <BarChart data={statusData} layout="vertical" margin={{left: 10}}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="tickets" layout="vertical" radius={5} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="by-region" className="space-y-4 mt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Tickets by Region</CardTitle>
                            <CardDescription>Total number of tickets for each region.</CardDescription>
                        </div>
                         <ExportButtons title="Tickets by Region" columns={['Region', 'Tickets']} data={regionData.map(d => [d.name, d.tickets])} />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Region</TableHead><TableHead className="text-right">Tickets</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {regionData.map(item => (
                                    <TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.tickets}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="by-assignee" className="space-y-4 mt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle>Assignee Performance</CardTitle>
                            <CardDescription>Tickets assigned to and resolved by each team member.</CardDescription>
                        </div>
                        <ExportButtons title="Assignee Performance" columns={['Assignee', 'Assigned', 'Resolved']} data={assigneeData.map(d => [d.name, d.assigned, d.resolved])} />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Assignee</TableHead><TableHead>Assigned</TableHead><TableHead>Resolved</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {assigneeData.map(item => (
                                    <TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell>{item.assigned}</TableCell><TableCell>{item.resolved}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
