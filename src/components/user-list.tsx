
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type UserProfile = {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'branch' | 'user' | 'it-support';
    branchName?: string;
    photoURL?: string;
    phoneNumber?: string;
}

const roleBadgeVariant: Record<UserProfile['role'], 'destructive' | 'secondary' | 'outline' | 'default'> = {
    admin: 'destructive',
    'it-support': 'secondary',
    branch: 'outline',
    user: 'outline'
};


export default function UserList() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, loading } = useCollection<UserProfile>(usersCollection);

    const handleDeleteClick = (user: UserProfile) => {
        setSelectedUser(user);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedUser) return;
        
        try {
            // Deleting the user document from Firestore.
            // Note: This does not delete the user from Firebase Authentication.
            // Deleting an auth user requires the Admin SDK in a secure backend environment.
            const userDocRef = doc(firestore, 'users', selectedUser.id);
            await deleteDoc(userDocRef);
            toast({
                title: 'User Profile Deleted',
                description: `The profile for ${selectedUser.displayName} has been deleted.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Error Deleting Profile',
                description: error.message,
            });
        } finally {
            setIsAlertOpen(false);
            setSelectedUser(null);
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: 'Password Reset Email Sent',
                description: `An email has been sent to ${email} with instructions to reset their password.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Error Sending Reset Email',
                description: error.message,
            });
        }
    };


    return (
        <>
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
                            <TableHead>Phone</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
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
                                        <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleResetPassword(user.email)}>
                                                        Reset Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                    >
                                                        Delete User
                                                    </DropdownMenuItem>
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

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user profile for{' '}
                            <span className="font-semibold">{selectedUser?.displayName}</span>. Their authentication account will remain, but they will be removed from this list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className={cn(buttonVariants({ variant: "destructive" }))}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
