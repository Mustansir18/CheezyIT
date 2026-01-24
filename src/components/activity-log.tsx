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
import { useCollection, useFirestore, useMemoFirebase, type WithId } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

type ActivityLog = {
  userName: string;
  action: string;
  details: string;
  timestamp: any;
};

const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('SENT')) return 'default';
    if (action.includes('UPDATE') || action.includes('ASSIGN')) return 'secondary';
    if (action.includes('DELETE') || action.includes('BLOCK')) return 'destructive';
    if (action.includes('LOGIN')) return 'outline';
    return 'outline';
}

export default function ActivityLog() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  const logsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, 'activityLogs'), orderBy('timestamp', 'desc')) : null,
      [firestore]
  );
  const { data: logs, isLoading } = useCollection<ActivityLog>(logsQuery);

  const uniqueUsers = useMemo(() => {
    if (!logs) return ['all'];
    return ['all', ...Array.from(new Set(logs.map(log => log.userName)))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
                            log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUser = userFilter === 'all' || log.userName === userFilter;

      return matchesSearch && matchesUser;
    });
  }, [logs, searchTerm, userFilter]);

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
            {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : filteredLogs && filteredLogs.length > 0 ? filteredLogs.map((log: WithId<ActivityLog>) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.userName}</TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>{log.details}</TableCell>
                <TableCell className="text-right">
                  {log.timestamp && format(log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp), "MMM d, yyyy, h:mm:ss a")}
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No activity logs found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
