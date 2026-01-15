
'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useMockTickets } from '@/lib/data';
import type { Ticket } from '@/lib/data';

const COLORS = {
  Pending: 'hsl(var(--chart-3))',
  'In Progress': 'hsl(var(--chart-4))',
  Resolved: 'hsl(var(--chart-2))',
  High: 'hsl(var(--destructive))',
  Medium: 'hsl(var(--chart-3))',
  Low: 'hsl(var(--muted-foreground))',
};

export default function AdminReports() {
  const { tickets, loading } = useMockTickets();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const filteredTickets = useMemo(() => {
    if (!date?.from) return tickets;
    return tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        // If there's no 'to' date, just check if it's after the 'from' date.
        if (!date.to) return ticketDate >= date.from;
        // Include the 'to' date in the range.
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999); // Set to end of day
        return ticketDate >= date.from && ticketDate <= toDate;
    });
  }, [tickets, date]);


  const { statusData, priorityData, chartConfig } = useMemo(() => {
    const statusCounts = { Pending: 0, 'In Progress': 0, Resolved: 0 };
    const priorityCounts = { Low: 0, Medium: 0, High: 0 };

    for (const ticket of filteredTickets) {
      statusCounts[ticket.status]++;
      priorityCounts[ticket.priority]++;
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

  if (loading) {
    return (
      <Card className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Ticket Analytics</CardTitle>
            <CardDescription>An overview of all support tickets in the system.</CardDescription>
          </div>
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
                                {payload?.map((entry: any) => {
                                  const { color, value: name, payload: { value: count } } = entry.payload;
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
  );
}
