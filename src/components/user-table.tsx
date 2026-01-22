'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase, type WithId } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { MoreHorizontal, Pencil, ShieldBan, Trash2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'User' | 'it-support' | 'Admin' | 'Branch';
  phoneNumber?: string;
  region?: string;
  regions?: string[];
  blockedUntil?: Timestamp;
};

const UserTableRow = React.memo(function UserTableRow({ user, onEdit, onBlock }: { user: WithId<User>; onEdit: (user: WithId<User>) => void; onBlock: (user: WithId<User>) => void; }) {
  const isBlocked = user.blockedUntil && user.blockedUntil.toDate() > new Date();
  
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

const UserTable = ({ onEdit, onBlock }: { onEdit: (user: User) => void; onBlock: (user: User) => void; }) => {
    const firestore = useFirestore();
    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);

    return (
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
                {usersLoading ? (
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
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );
};

export default React.memo(UserTable);
