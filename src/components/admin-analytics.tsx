
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, XAxis, YAxis, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Ticket } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportData } from '@/lib/export';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function ExportButtons({ title, columns, data }: { title: string, columns: string[], data: any[][] }) {
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();

    const handleExport = async (format: 'pdf' | 'excel') => {
        setExporting(true);
        // Mock export, no actual file generation
        setTimeout(() => {
            toast({
                title: 'Export Started (Mock)',
                description: `Generating ${format.toUpperCase()} file for "${title}".`,
            });
            setExporting(false);
        }, 1000);
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

export default function AdminAnalytics() {
  const isMobile = useIsMobile();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });
   const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

  const loading = false; // Mock loading state

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
                        <CardDescription>Firebase is detached. All data is mocked.</CardDescription>
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
      
        <div className="text-center text-muted-foreground py-10">
          Analytics are not available because Firebase has been detached.
        </div>
    </div>
  );
}
