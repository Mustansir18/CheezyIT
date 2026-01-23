'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Filter, FileDown, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStats, TICKET_STATUS_LIST } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminTicketList() {
  const { toast } = useToast();
  const [ticketIdFilter, setTicketIdFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);
  
  const loading = false;

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const stats = useMemo(() => getStats([]), []);
  
  if (loading) {
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
                <Button id="date" variant={"outline"} className={cn( "w-full sm:w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground" )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? ( date.to ? ( <> {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")} </> ) : ( format(date.from, "LLL dd, y") ) ) : ( <span>Pick a date</span> )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={(range) => { setDate(range); setActiveDatePreset(null); }} numberOfMonths={2}/>
            </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'today' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfDay(new Date()), to: endOfDay(new Date())}); setActiveDatePreset('today'); }}>Today</Button>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'this_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(new Date()), to: endOfMonth(new Date())}); setActiveDatePreset('this_month'); }}>This Month</Button>
            <Button variant="outline" size="sm" className={cn("border-transparent", activeDatePreset === 'last_month' ? "bg-yellow-300 hover:bg-yellow-400 text-yellow-900" : "bg-sky-100 hover:bg-sky-200 text-sky-800")} onClick={() => { setDate({from: startOfMonth(subMonths(new Date(),1)), to: endOfMonth(subMonths(new Date(), 1))}); setActiveDatePreset('last_month'); }}>Last Month</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        {TICKET_STATUS_LIST.map(status => (
            <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{status}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats[status.toLowerCase().replace('-', '') as keyof typeof stats]}</div>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>Firebase is detached, so no tickets can be shown.</CardDescription>
                </div>
            </div>
             <div className="flex items-center gap-2 mt-4">
                <Input
                    placeholder="Search by ID, title, or description..."
                    value={ticketIdFilter}
                    onChange={(e) => setTicketIdFilter(e.target.value)}
                    className="h-9 max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />User</Button></DropdownMenuTrigger>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Status</Button></DropdownMenuTrigger>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9"><Filter className="mr-2 h-3 w-3" />Region</Button></DropdownMenuTrigger>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 gap-3">
                <div className="col-span-full h-24 flex items-center justify-center text-muted-foreground">
                    No tickets found.
                </div>
            </div>
        </CardContent>
      </Card>
    </>
  );
}
