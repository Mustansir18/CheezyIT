
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


type UserProfile = {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'branch' | 'user' | 'it-support';
    branchName?: string;
    photoURL?: string;
}

const roleBadgeVariant: Record<UserProfile['role'], 'destructive' | 'secondary' | 'outline' | 'default'> = {
    admin: 'destructive',
    'it-support': 'secondary',
    branch: 'outline',
    user: 'outline'
};


export default function UserList() {
    const firestore = useFirestore();

    const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);

    const { data: users, loading } = useCollection<UserProfile>(usersCollection);

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Accounts</CardTitle>
                <CardDescription>A list of all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : users && users.length > 0 ? (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL} />
                                                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{user.displayName}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={roleBadgeVariant[user.role] || 'secondary'} className={cn(user.role === 'it-support' && 'border-primary/50 text-primary')}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.branchName || 'N/A'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
