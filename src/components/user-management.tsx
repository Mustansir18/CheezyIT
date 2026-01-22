'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useDoc, useMemoFirebase, type WithId, errorEmitter, FirestorePermissionError, useAuth } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile as updateAuthProfile, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, doc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteField, Timestamp } from 'firebase/firestore';
import { add } from 'date-fns';
import { Loader2, UserPlus, MoreHorizontal, Pencil, Trash2, Plus, ShieldBan } from 'lucide-react';

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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from './ui/separator';


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

    const handleBlockUser = () => {
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

        updateDoc(userDocRef, updateData)
            .then(() => {
                toast({ title: 'Success', description: `User ${user.displayName} has been updated.` });
                onOpenChange(false);
            })
            .catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user block status.' });
            })
            .finally(() => {
                setIsSubmitting(false);
                setDuration('');
            });
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Block User: {user.displayName}</DialogTitle>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleBlockUser} disabled={isSubmitting || !duration}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Action
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

const EditUserDialog = React.memo(function EditUserDialog({ user, roles, regions, onOpenChange, open }: { user: User; roles: readonly string[]; regions: string[]; open: boolean; onOpenChange: (open: boolean) => void; }) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    const form = useForm<EditUserFormData>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            displayName: user.displayName,
            role: user.role,
            regions: user.role === 'User' || user.role === 'Branch' ? (user.region ? [user.region] : []) : (user.regions || []),
        },
    });
    
    const { formState: { isSubmitting }, watch, reset } = form;
    const selectedRole = watch('role');

    useEffect(() => {
        if (open) {
            reset({
                displayName: user.displayName,
                role: user.role,
                regions: user.role === 'User' || user.role === 'Branch' ? (user.region ? [user.region] : []) : (user.regions || []),
            });
        }
    }, [user, open, reset]);

    const onSubmit = (data: EditUserFormData) => {
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

        updateDoc(userDocRef, updateData)
            .then(() => {
                toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
                onOpenChange(false);
            })
            .catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update user profile.' });
            });
    };

    const handlePasswordReset = () => {
        if (!user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'User does not have an email address.' });
            return;
        }
        setIsResettingPassword(true);
        sendPasswordResetEmail(auth, user.email)
            .then(() => {
                toast({ title: 'Email Sent', description: `A password reset link has been sent to ${user.email}.` });
                onOpenChange(false);
            })
            .catch((error) => {
                console.error("Password reset error:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to send password reset email.' });
            })
            .finally(() => {
                setIsResettingPassword(false);
            });
    };
    
    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {user.displayName}</DialogTitle>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
                                        defaultValue={field.value?.[0]}
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
                                    />
                                )}
                                <FormDescription>
                                    {selectedRole === 'User' || selectedRole === 'Branch' ? 'Assign to a single region.' : "Assign one or more regions."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <Separator className="my-4" />

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Password Reset</h3>
                             <Button
                                type="button"
                                variant="secondary"
                                onClick={handlePasswordReset}
                                disabled={isResettingPassword}
                            >
                                {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Password Reset Email
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                This will send a link to the user's email ({user.email}). This action requires the user to have a valid, accessible email address.
                            </p>
                        </div>


                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
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

const RegionManagement = React.memo(function RegionManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settingsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: settingsData, isLoading } = useDoc<{ list: string[] }>(settingsRef);

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    setIsSubmitting(true);
    const trimmedItem = newItem.trim();
    setDoc(settingsRef, { list: arrayUnion(trimmedItem) }, { merge: true })
      .then(() => {
        toast({ title: 'Success', description: `${trimmedItem} added.` });
        setNewItem('');
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'update',
            requestResourceData: { list: [trimmedItem]}
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error', description: `Could not add item.` });
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDeleteItem = (item: string) => {
    updateDoc(settingsRef, { list: arrayRemove(item) })
      .then(() => {
        toast({ title: 'Success', description: `${item} removed.` });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'update',
            requestResourceData: { list: arrayRemove(item) } // This is symbolic
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error', description: `Could not remove item.` });
      });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Manage Regions</CardTitle>
        <CardDescription>Add or remove regions available for user assignment.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="New region..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <Button onClick={handleAddItem} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="sr-only">Add</span>
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            settingsData?.list?.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">{item}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the "{item}" region.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteItem(item)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
});


export default function UserManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [blockingUser, setBlockingUser] = useState<User | null>(null);

  const handleEditDialogChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setEditingUser(null);
  }, []);

  const handleBlockDialogChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setBlockingUser(null);
  }, []);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);
  
  const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);
  const regions = regionsData?.list || [];
  
  const isLoading = usersLoading || regionsLoading;

  const addUserForm = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { displayName: '', email: '', password: '', role: '', regions: [] },
  });

  const { handleSubmit: handleAddUserSubmit, formState: { isSubmitting: isAddingUser }, watch: watchAddUser, control: addUserControl, reset: resetAddUserForm } = addUserForm;

  const onAddUserSubmit = (data: NewUserFormData) => {
    const tempAppName = `user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    createUserWithEmailAndPassword(tempAuth, data.email, data.password)
      .then(async (userCredential) => {
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


        try {
            await setDoc(doc(firestore, 'users', newUser.uid), userData);
            toast({ title: 'Success!', description: 'New user created successfully.' });
            resetAddUserForm();
            setIsAddUserOpen(false);
        } catch (dbError) {
            const permissionError = new FirestorePermissionError({
              path: `users/${newUser.uid}`,
              operation: 'create',
              requestResourceData: userData
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ 
              variant: 'destructive', 
              title: 'Database Write Failed', 
              description: `User account was created, but saving the profile failed. Please delete the user with email '${data.email}' from the Firebase Console (Authentication tab) and try again.`,
              duration: 10000,
            });
        }
      })
      .catch((authError: any) => {
        let description = `The email '${data.email}' is already in use by another account. This can happen if a previous registration failed. Please go to your Firebase Project's Authentication tab, find and delete the user with this email, and then try creating them again.`;
        if (authError.code !== 'auth/email-already-in-use') {
            description = authError.message || 'An unknown authentication error occurred.';
        }
        toast({ 
            variant: 'destructive', 
            title: 'Error Creating User', 
            description,
            duration: 15000,
        });
      })
      .finally(() => {
        deleteApp(tempApp);
      });
  };

  return (
    <>
    <RegionManagement />
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage all users in the system.</CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    resetAddUserForm();
                }
                setIsAddUserOpen(isOpen);
            }}>
                <DialogTrigger asChild>
                    <Button disabled={isLoading}>
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
                    <Form {...addUserForm}>
                        <form onSubmit={handleAddUserSubmit(onAddUserSubmit)} className="space-y-4">
                             <FormField control={addUserControl} name="displayName" render={({ field }) => (
                                <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={addUserControl} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={addUserControl} name="password" render={({ field }) => (
                                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={addUserControl} name="role" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {AVAILABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={addUserControl} name="regions" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Region(s)</FormLabel>
                                    {watchAddUser('role') === 'User' || watchAddUser('role') === 'Branch' ? (
                                        <Select
                                            onValueChange={(value) => field.onChange(value ? [value] : [])}
                                            defaultValue={field.value?.[0]}
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
                                        />
                                    )}
                                    <FormDescription>
                                        {watchAddUser('role') === 'User' || watchAddUser('role') === 'Branch' ? 'Assign to a single region.' : "Assign one or more regions."}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isAddingUser}>
                                    {isAddingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
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
                <TableRow key={user.id} className={user.blockedUntil && user.blockedUntil.toDate() > new Date() ? 'bg-destructive/10' : ''}>
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
                            <DropdownMenuItem onClick={() => setEditingUser(user)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setBlockingUser(user)}><ShieldBan className="mr-2 h-4 w-4" /> Block/Unblock</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" disabled>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete (Not available)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {editingUser && (
        <EditUserDialog 
            user={editingUser}
            roles={AVAILABLE_ROLES}
            regions={regions}
            open={!!editingUser}
            onOpenChange={handleEditDialogChange}
        />
    )}
    
    <BlockUserDialog
        user={blockingUser}
        open={!!blockingUser}
        onOpenChange={handleBlockDialogChange}
    />
    </>
  );
}
