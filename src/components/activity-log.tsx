'use client';

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
import { format } from 'date-fns';

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Showing all logged events across the application.
        </CardDescription>
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
            {mockLogs.map((log) => (
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
