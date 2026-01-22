'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useDoc, useMemoFirebase, type WithId, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { collection, query, doc, setDoc, updateDoc, deleteField, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import { Loader2, UserPlus, MoreHorizontal, Pencil, Trash2, ShieldBan } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiSelect } from '@/components/ui/multi-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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

const AVAILABLE_ROLES = ['User', 'Branch', 'it-support', 'Admin'];

// Schemas
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

const BlockUserDialog = React.memo(function BlockUserDialog({ user, open, onOpenChange }: { user: User | null; open: boolean; onOpenChange: (open: boolean) => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [duration, setDuration] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (!open) {
        setDuration('');
      }
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
            const now = new Date();
            blockedUntil = Timestamp.fromDate(add(now, { [unit + 's']: parseInt(amount) }));
        }
        
        const updateData = { blockedUntil };
        const userDocRef = doc(firestore, 'users', user.id);

        try {
            await updateDoc(userDocRef, updateData);
            toast({ title: 'Success', description: `User ${user.displayName} has been updated.` });
            onOpenChange(false);
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
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
                    <DialogDescription>
                        Select a duration to block this user. They will not be able to log in until the block expires.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setDuration} value={duration}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select block duration..." />
                        </SelectTrigger>
                        <SelectContent>
                            {blockDurations.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleBlockUser} disabled={isSubmitting || !duration}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Action
                    </Button>
                </DialogFooter>
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
    
    const { formState: { isSubmitting }, watch, reset } = form;
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
            updateData.regions = deleteField();
        } else {
            updateData.regions = data.regions;
            updateData.region = deleteField();
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
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Modify the details for {user?.displayName}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="displayName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Display Name</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={regionsLoading}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {AVAILABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="regions" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Region(s)</FormLabel>
                                {selectedRole === 'User' || selectedRole === 'Branch' ? (
                                    <Select
                                        onValueChange={(value) => field.onChange(value ? [value] : [])}
                                        value={field.value?.[0]}
                                        disabled={regionsLoading}
                                    >
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a region" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <MultiSelect
                                        options={regions.map(r => ({ value: r, label: r }))}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Select regions..."
                                        disabled={regionsLoading}
                                    />
                                )}
                                <FormDescription>
                                    {selectedRole === 'User' || selectedRole === 'Branch' ? 'Assign to a single region.' : "Assign one or more regions."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || regionsLoading}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
});

const AddUserDialog = React.memo(function AddUserDialog({ open, onOpenChange, regions, regionsLoading }: { open: boolean, onOpenChange: (open: boolean) => void, regions: string[], regionsLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const form = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
        defaultValues: { displayName: '', email: '', password: '', role: '', regions: [] },
    });

    const { handleSubmit, formState: { isSubmitting }, watch, control, reset } = form;

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open, reset]);

    const selectedRole = watch('role');

    const onSubmit = async (data: NewUserFormData) => {
        const tempAppName = `user-creation-temp`;
        let tempApp;

        try {
            try {
                tempApp = initializeApp(firebaseConfig, tempAppName);
            } catch (e) {
                const existingApp = getApp(tempAppName);
                await deleteApp(existingApp);
                tempApp = initializeApp(firebaseConfig, tempAppName);
            }

            const tempAuth = getAuth(tempApp);
            const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
            const newUser = userCredential.user;
            await updateAuthProfile(newUser, { displayName: data.displayName });
            
            const userData: {
                displayName: string;
                email: string;
                role: string;
                phoneNumber: string;
                region?: string;
                regions?: string[];
            } = { 
                displayName: data.displayName, 
                email: data.email, 
                role: data.role, 
                phoneNumber: '' 
            };
            
            if (data.role === 'User' || data.role === 'Branch') {
                userData.region = data.regions[0] || '';
            } else {
                userData.regions = data.regions;
            }

            await setDoc(doc(firestore, 'users', newUser.uid), userData);
            toast({ title: 'Success!', description: 'New user created successfully.' });
            onOpenChange(false);

        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                 toast({ 
                    variant: 'destructive', 
                    title: 'Error Creating User', 
                    description: `The email '${data.email}' is already in use by another account. Please delete the user from the Firebase Console (Authentication tab) and try again.`,
                    duration: 10000,
                });
            } else if (error.name === 'FirebaseError' && error.code) { // Firestore permission error
                 const permissionError = new FirestorePermissionError({
                    path: `users/some-user-id`,
                    operation: 'create',
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ 
                    variant: 'destructive', 
                    title: 'Database Write Failed', 
                    description: `User account was created, but saving the profile failed. Please delete the user with email '${data.email}' from the Firebase Console (Authentication tab) and try again.`,
                    duration: 10000,
                });
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'An Unknown Error Occurred', 
                    description: error.message || 'Please check the console for details.',
                    duration: 10000,
                });
            }
        } finally {
            if (tempApp) {
                await deleteApp(tempApp);
            }
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
                    <DialogDescription>
                        Fill out the form to create a new user account.
                    </DialogDescription>
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
                                <SelectContent>
                                    {AVAILABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={control} name="regions" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Region(s)</FormLabel>
                            {selectedRole === 'User' || selectedRole === 'Branch' ? (
                                <Select
                                    onValueChange={(value) => field.onChange(value ? [value] : [])}
                                    value={field.value?.[0]}
                                    disabled={regionsLoading}
                                >
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a region" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <MultiSelect
                                    options={regions.map(r => ({ value: r, label: r }))}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select regions..."
                                    disabled={regionsLoading}
                                />
                            )}
                            <FormDescription>
                                {selectedRole === 'User' || selectedRole === 'Branch' ? 'Assign to a single region.' : "Assign one or more regions."}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || regionsLoading}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create User
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
});

const UserTableRow = React.memo(function UserTableRow({ user, onEdit, onBlock }: { user: WithId<User>; onEdit: (user: WithId<User>) => void; onBlock: (user: WithId<User>) => void; }) {
  return (
    <TableRow className={user.blockedUntil && user.blockedUntil.toDate() > new Date() ? 'bg-destructive/10' : ''}>
      <TableCell className="font-medium flex items-center gap-2">
        {user.displayName}
        {user.blockedUntil && user.blockedUntil.toDate() > new Date() && (
            <Badge variant="destructive">Blocked</Badge>
        )}
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

export default function UserManagement() {
  const firestore = useFirestore();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [blockingUser, setBlockingUser] = useState<User | null>(null);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, isLoading } = useCollection<WithId<User>>(usersQuery);
  
  const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);
  const availableRegions = useMemo(() => regionsData?.list || [], [regionsData]);

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
              <TableRow><TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell></TableRow>
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