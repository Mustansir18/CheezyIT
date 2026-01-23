
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, type WithId, errorEmitter, FirestorePermissionError, useCollection } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { collection, query, doc, setDoc, updateDoc, deleteField, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import { Loader2, UserPlus, MoreHorizontal, Pencil, ShieldBan, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { isRoot } from '@/lib/admins';
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
  phoneNumber?: string;
  region?: string;
  regions?: string[];
  blockedUntil?: Timestamp;
};


const AVAILABLE_ROLES = ['User', 'Branch', 'it-support', 'Admin'];

const newUserSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.string().min(1, 'Role is required.'),
  regions: z.array(z.string()).min(1, 'At least one region must be assigned.'),
});
type NewUserFormData = z.infer<typeof newUserSchema>;

const editUserSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
  role: z.string().min(1, 'Role is required.'),
  regions: z.array(z.string()).min(1, 'At least one region must be assigned.'),
});
type EditUserFormData = z.infer<typeof editUserSchema>;

const blockDurations = [
    { value: 'unblock', label: 'Unblock User'},
    { value: '1-hour', label: '1 Hour' },
    { value: '1-day', label: '1 Day' },
    { value: '7-days', label: '7 Days' },
    { value: '30-days', label: '30 Days' },
    { value: 'indefinite', label: 'Indefinite' },
];

const AddUserDialog = React.memo(function AddUserDialog({ open, onOpenChange, regions, regionsLoading }: { open: boolean, onOpenChange: (open: boolean) => void, regions: string[], regionsLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const form = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
        defaultValues: { displayName: '', email: '', password: '', role: '', regions: [] },
    });
    const { handleSubmit, formState: { isSubmitting }, watch, control, reset } = form;

    useEffect(() => {
        if (!open) reset();
    }, [open, reset]);

    const selectedRole = watch('role');

    const onSubmit = async (data: NewUserFormData) => {
        const tempAppName = `user-creation-temp-${Date.now()}`;
        let tempApp;

        try {
            tempApp = initializeApp(firebaseConfig, tempAppName);
            const tempAuth = getAuth(tempApp);
            const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
            const newUser = userCredential.user;
            await updateAuthProfile(newUser, { displayName: data.displayName });
            
            const userData: any = { 
                displayName: data.displayName, 
                email: data.email, 
                role: data.role, 
                phoneNumber: '' 
            };
            
            if (data.role === 'User' || data.role === 'Branch') {
                userData.region = data.regions[0] || '';
                userData.regions = [];
            } else {
                userData.regions = data.regions;
                userData.region = '';
            }

            await setDoc(doc(firestore, 'users', newUser.uid), userData);
            toast({ title: 'Success!', description: 'New user created successfully.' });
            onOpenChange(false);
        } catch (error: any) {
            let description = 'An unknown error occurred. Please check the console for details.';
            if (error.code === 'auth/email-already-in-use') {
                description = `The email '${data.email}' is already in use by another account.`;
            } else if (error.name === 'FirebaseError' && error.message.includes('permission-denied')) {
                 const permissionError = new FirestorePermissionError({ path: `users/some-user-id`, operation: 'create' });
                errorEmitter.emit('permission-error', permissionError);
                description = `User account was created, but saving the profile failed. You may not have write permissions. The user should be deleted from the Firebase Console before retrying.`;
            } else if (error.code) { // General Firebase auth errors
                description = error.message;
            }
            toast({ variant: 'destructive', title: 'Error Creating User', description, duration: 10000 });
        } finally {
            if (tempApp) await deleteApp(tempApp);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={regionsLoading}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Fill out the form to create a new user account.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={control} name="displayName" render={({ field }) => (
                            <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={regionsLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                    <SelectContent>{AVAILABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={control} name="regions" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Region(s)</FormLabel>
                                {selectedRole === 'User' || selectedRole === 'Branch' ? (
                                    <Select onValueChange={(value) => field.onChange(value ? [value] : [])} value={field.value?.[0]} disabled={regionsLoading}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a region" /></SelectTrigger></FormControl>
                                        <SelectContent>{regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                    </Select>
                                ) : (
                                    <MultiSelect options={regions.map(r => ({ value: r, label: r }))} selected={field.value || []} onChange={field.onChange} placeholder="Select regions..." disabled={regionsLoading} />
                                )}
                                <FormDescription>{selectedRole === 'User' || selectedRole === 'Branch' ? 'Assign to a single region.' : "Assign one or more regions."}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || regionsLoading}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create User</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
});

const EditUserDialog = React.memo(function EditUserDialog({ user, open, onOpenChange, regions, regionsLoading }: { user: User | null; open: boolean; onOpenChange: (open: boolean) => void; regions: string[], regionsLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const form = useForm<EditUserFormData>({
        resolver: zodResolver(editUserSchema),
        defaultValues: { displayName: '', role: '', regions: [] },
    });
    const { handleSubmit, formState: { isSubmitting }, watch, control, reset } = form;
    const selectedRole = watch('role');

    useEffect(() => {
        if (open && user) {
            reset({
                displayName: user.displayName,
                role: user.role,
                regions: user.role === 'User' || user.role === 'Branch' ? (user.region ? [user.region] : []) : (user.regions || []),
            });
        }
    }, [user, open, reset]);

    const onSubmit = async (data: EditUserFormData) => {
        if (!user) return;
        const userDocRef = doc(firestore, 'users', user.id);
        const updateData: any = {
            displayName: data.displayName,
            role: data.role,
        };

        if (data.role === 'User' || data.role === 'Branch') {
            updateData.region = data.regions[0] || '';
            updateData.regions = [];
        } else {
            updateData.regions = data.regions || [];
            updateData.region = '';
        }

        try {
            await updateDoc(userDocRef, updateData);
            toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
            onOpenChange(false);
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update user profile.' });
        }
    };
    
    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {user?.displayName}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={control} name="displayName" render={({ field }) => (
                            <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={regionsLoading}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{AVAILABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={control} name="regions" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Region(s)</FormLabel>
                                {selectedRole === 'User' || selectedRole === 'Branch' ? (
                                    <Select onValueChange={(value) => field.onChange(value ? [value] : [])} value={field.value?.[0]} disabled={regionsLoading}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a region" /></SelectTrigger></FormControl>
                                        <SelectContent>{regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                    </Select>
                                ) : (
                                    <MultiSelect options={regions.map(r => ({ value: r, label: r }))} selected={field.value || []} onChange={field.onChange} placeholder="Select regions..." disabled={regionsLoading} />
                                )}
                                <FormDescription>{selectedRole === 'User' || selectedRole === 'Branch' ? 'Assign to a single region.' : "Assign one or more regions."}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || regionsLoading}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
});

const BlockUserDialog = React.memo(function BlockUserDialog({ user, open, onOpenChange }: { user: User | null; open: boolean; onOpenChange: (open: boolean) => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [duration, setDuration] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (!open) setDuration('');
    }, [open]);

    const handleBlockUser = async () => {
        if (!user || !duration) return;
        setIsSubmitting(true);
        let blockedUntil: Timestamp | ReturnType<typeof deleteField>;
        if (duration === 'unblock') {
            blockedUntil = deleteField();
        } else if (duration === 'indefinite') {
            blockedUntil = Timestamp.fromDate(new Date('9999-12-31T23:59:59Z'));
        } else {
            const [amount, unit] = duration.split('-');
            blockedUntil = Timestamp.fromDate(add(new Date(), { [unit + 's']: parseInt(amount) }));
        }
        
        const updateData = { blockedUntil };
        const userDocRef = doc(firestore, 'users', user.id);

        try {
            await updateDoc(userDocRef, updateData);
            toast({ title: 'Success', description: `User ${user.displayName} has been updated.` });
            onOpenChange(false);
        } catch (error) {
            const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: updateData });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user block status.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Block User: {user?.displayName}</DialogTitle>
                    <DialogDescription>Select a duration to block this user. They will not be able to log in until the block expires.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setDuration} value={duration}>
                        <SelectTrigger><SelectValue placeholder="Select block duration..." /></SelectTrigger>
                        <SelectContent>{blockDurations.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleBlockUser} disabled={isSubmitting || !duration}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Action</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

const UserTableRow = React.memo(function UserTableRow({ user, onEdit, onBlock }: { user: WithId<User>; onEdit: (user: WithId<User>) => void; onBlock: (user: WithId<User>) => void; }) {
  const isBlocked = user.blockedUntil && user.blockedUntil.toDate() > new Date();

  const displayedRegions = useMemo(() => {
    if (user.role === 'User' || user.role === 'Branch') {
        return user.region || 'N/A';
    }
    if (user.regions && user.regions.length > 0) {
        return user.regions.join(', ');
    }
    return 'N/A';
  }, [user.role, user.region, user.regions]);
  
  return (
    <TableRow className={isBlocked ? 'bg-destructive/10' : ''}>
      <TableCell className="font-medium flex items-center gap-2">
        {user.displayName}
        {isBlocked && <Badge variant="destructive">Blocked</Badge>}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell><Badge variant={user.role === 'it-support' || user.role === 'Admin' ? 'secondary' : 'outline'}>{user.role}</Badge></TableCell>
      <TableCell>{displayedRegions}</TableCell>
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

export default function UserManagement({ userIsAdminOrRoot }: { userIsAdminOrRoot: boolean }) {
    const firestore = useFirestore();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [blockingUser, setBlockingUser] = useState<User | null>(null);

    const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
    const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);
    const availableRegions = useMemo(() => regionsData?.list || [], [regionsData]);
    
    const { data: users, isLoading: usersDataLoading } = useCollection<WithId<User>>(
        useMemoFirebase(
            () => (userIsAdminOrRoot ? query(collection(firestore, 'users')) : null),
            [firestore, userIsAdminOrRoot]
        )
    );
      
    const isLoading = usersDataLoading || regionsLoading;

    const handleAddUserOpenChange = useCallback((isOpen: boolean) => setIsAddUserOpen(isOpen), []);
    const handleEdit = useCallback((user: User) => setEditingUser(user), []);
    const handleBlock = useCallback((user: User) => setBlockingUser(user), []);
    const handleEditDialogChange = useCallback((isOpen: boolean) => { if (!isOpen) setEditingUser(null); }, []);
    const handleBlockDialogChange = useCallback((isOpen: boolean) => { if (!isOpen) setBlockingUser(null); }, []);
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>User Accounts</CardTitle>
                            <CardDescription>View and manage all users in the system.</CardDescription>
                        </div>
                        <AddUserDialog
                            open={isAddUserOpen}
                            onOpenChange={handleAddUserOpenChange}
                            regions={availableRegions}
                            regionsLoading={regionsLoading}
                        />
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
                                onEdit={handleEdit}
                                onBlock={handleBlock}
                                />
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {userIsAdminOrRoot ? 'No users found.' : 'You do not have permission to view users.'}
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <EditUserDialog 
                user={editingUser}
                open={!!editingUser}
                onOpenChange={handleEditDialogChange}
                regions={availableRegions}
                regionsLoading={regionsLoading}
            />
            <BlockUserDialog
                user={blockingUser}
                open={!!blockingUser}
                onOpenChange={handleBlockDialogChange}
            />
        </>
    );
}
