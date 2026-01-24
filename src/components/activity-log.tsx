'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Filter } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ActivityLog = {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: Date;
};

const mockLogs: ActivityLog[] = [
  { id: '1', user: 'Admin', action: 'USER_UPDATE', details: 'Updated profile for user "Demo User"', timestamp: new Date(Date.now() - 2 * 60 * 1000) },
  { id: '2', user: 'Admin', action: 'REGION_ADD', details: 'Added new region "Region D"', timestamp: new Date(Date.now() - 5 * 60 * 1000) },
  { id: '3', user: 'Demo User', action: 'TICKET_CREATE', details: 'Created ticket TKT-000002: "Printer not working"', timestamp: new Date(Date.now() - 15 * 60 * 1000) },
  { id: '4', user: 'Admin', action: 'LOGIN', details: 'Admin signed in successfully', timestamp: new Date(Date.now() - 30 * 60 * 1000) },
  { id: '5', user: 'Support Person', action: 'TICKET_UPDATE', details: 'Changed status of TKT-000001 to "In-Progress"', timestamp: new Date(Date.now() - 60 * 60 * 1000) },
  { id: '6', user: 'Demo User', action: 'LOGIN', details: 'User signed in successfully', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
];

const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'default';
    if (action.includes('UPDATE')) return 'secondary';
    if (action.includes('DELETE') || action.includes('BLOCK')) return 'destructive';
    if (action.includes('LOGIN')) return 'outline';
    return 'outline';
}

export default function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  const uniqueUsers = useMemo(() => ['all', ...Array.from(new Set(mockLogs.map(log => log.user)))], []);

  const filteredLogs = useMemo(() => {
    return mockLogs.filter(log => {
      const matchesSearch = searchTerm === '' || 
                            log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUser = userFilter === 'all' || log.user === userFilter;

      return matchesSearch && matchesUser;
    });
  }, [searchTerm, userFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                Showing all logged events across the application.
                </CardDescription>
            </div>
        </div>
         <div className="flex items-center gap-2 mt-4">
            <Input
                placeholder="Search by details, user, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 max-w-sm"
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <Filter className="mr-2 h-3 w-3" />
                        User: {userFilter === 'all' ? 'All' : userFilter}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuRadioGroup value={userFilter} onValueChange={setUserFilter}>
                        {uniqueUsers.map(user => (
                            <DropdownMenuRadioItem key={user} value={user}>
                                {user === 'all' ? 'All' : user}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.user}</TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>{log.details}</TableCell>
                <TableCell className="text-right">
                  {format(log.timestamp, "MMM d, yyyy, h:mm:ss a")}
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No logs found matching your criteria.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
