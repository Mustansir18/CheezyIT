'use client';

import React, { useMemo } from 'react';
import { Loader2, UserPlus, MoreHorizontal, Pencil, ShieldBan, Trash2 } from 'lucide-react';
import { isRoot } from '@/lib/admins';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'User' | 'it-support' | 'Admin' | 'Branch';
  phoneNumber?: string;
  region?: string;
  regions?: string[];
  blockedUntil?: Date; // Changed from Timestamp
};

export interface UserTableProps {
  onEdit: (user: User) => void;
  onBlock: (user: User) => void;
  onAddUser: () => void;
  isAddUserDisabled: boolean;
}

const UserTableRow = React.memo(function UserTableRow({ user, onEdit, onBlock }: { user: User; onEdit: (user: User) => void; onBlock: (user: User) => void; }) {
  const isBlocked = user.blockedUntil && user.blockedUntil > new Date();
  
  return (
    <TableRow className={isBlocked ? 'bg-destructive/10' : ''}>
      <TableCell className="font-medium flex items-center gap-2">
        {user.displayName}
        {isBlocked && <Badge variant="destructive">Blocked</Badge>}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell><Badge variant={user.role === 'it-support' || user.role === 'Admin' ? 'secondary' : 'outline'}>{user.role}</Badge></TableCell>
      <TableCell>{user.region || user.regions?.join(', ') || 'N/A'}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(user)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onBlock(user)}><ShieldBan className="mr-2 h-4 w-4" /> Block/Unblock</DropdownMenuItem>
                <DropdownMenuItem className="text-red-500" disabled>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete (Not available)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export default function UserTable({ onEdit, onBlock, onAddUser, isAddUserDisabled }: UserTableProps) {
  const userLoading = false;
  const users: User[] = [];
  const usersDataLoading = false;
  const userIsRoot = false;
  
  const isLoading = userIsRoot && (userLoading || usersDataLoading);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>User Accounts</CardTitle>
                <CardDescription>View and manage all users in the system.</CardDescription>
            </div>
            <Button onClick={onAddUser} disabled={isAddUserDisabled}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Region(s)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  onEdit={onEdit}
                  onBlock={onBlock}
                />
              ))
            ) : (
              <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                      User data not available. Firebase is detached.
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
