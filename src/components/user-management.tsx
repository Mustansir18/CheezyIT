'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, MoreHorizontal, Pencil, ShieldBan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'User' | 'it-support' | 'Admin' | 'Branch';
  region?: string;
  regions?: string[];
  blockedUntil?: Date;
};

const mockUsers: User[] = [
    { id: 'admin-user-id', displayName: 'Admin', email: 'mustansir133@gmail.com', role: 'Admin', regions: ['all'] },
    { id: 'support-user-1', displayName: 'Support Person', email: 'support@example.com', role: 'it-support', regions: ['Region A', 'Region B'] },
    { id: 'user-1', displayName: 'Demo User', email: 'user@example.com', role: 'User', region: 'Region A' },
];

export default function UserManagement({ userIsAdminOrRoot: isPrivileged }: { userIsAdminOrRoot: boolean }) {
    const [users, setUsers] = useState<User[]>(mockUsers);
    const isLoading = false;
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>User Accounts</CardTitle>
                            <CardDescription>Firebase is detached. This is a mock user list.</CardDescription>
                        </div>
                         <Button disabled>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User (Disabled)
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
                                <TableRow key={user.id}>
                                    <TableCell>{user.displayName}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><Badge variant={user.role === 'it-support' || user.role === 'Admin' ? 'secondary' : 'outline'}>{user.role}</Badge></TableCell>
                                    <TableCell>{user.region || user.regions?.join(', ')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                <DropdownMenuItem disabled><ShieldBan className="mr-2 h-4 w-4" /> Block/Unblock</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
