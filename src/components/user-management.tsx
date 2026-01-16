
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useDoc, useMemoFirebase, type WithId } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { collection, query, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Loader2, UserPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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

type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'User' | 'it-support' | 'Admin';
  phoneNumber?: string;
  region?: string;
  regions?: string[];
};

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


function EditUserDialog({ user, roles, regions, onOpenChange, open }: { user: User; roles: string[]; regions: string[]; open: boolean; onOpenChange: (open: boolean) => void; }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const form = useForm<EditUserFormData>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            displayName: user.displayName,
            role: user.role,
            regions: user.role === 'User' ? (user.region ? [user.region] : []) : (user.regions || []),
        },
    });
    
    const { formState: { isSubmitting }, watch, reset } = form;
    const selectedRole = watch('role');

    useEffect(() => {
        if (open) {
            reset({
                displayName: user.displayName,
                role: user.role,
                regions: user.role === 'User' ? (user.region ? [user.region] : []) : (user.regions || []),
            });
        }
    }, [user, open, reset]);


    const onSubmit = async (data: EditUserFormData) => {
        try {
            const userDocRef = doc(firestore, 'users', user.id);
            const updateData: any = {
                displayName: data.displayName,
                role: data.role,
            };

            if (data.role === 'User') {
                updateData.region = data.regions[0] || '';
                updateData.regions = [];
            } else {
                updateData.regions = data.regions;
                updateData.region = '';
            }

            await updateDoc(userDocRef, updateData);
            
            toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error updating user:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update user profile.' });
        }
    };

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {user.displayName}</DialogTitle>
                    <DialogDescription>
                        Modify the user's details below. Note: Changing name here only affects the database record.
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
                                {selectedRole === 'User' ? (
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
                                    {selectedRole === 'User' ? 'Assign to a single region.' : "Assign one or more regions."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
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
}

export default function UserManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);
  
  const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);
  const regions = regionsData?.list || [];
  
  const rolesRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'roles'), [firestore]);
  const { data: rolesData, isLoading: rolesLoading } = useDoc<{ list: string[] }>(rolesRef);
  const roles = rolesData?.list || [];

  const isLoading = usersLoading || regionsLoading || rolesLoading;

  const addUserForm = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { displayName: '', email: '', password: '', role: '', regions: [] },
  });

  const { formState: { isSubmitting: isAddingUser }, watch: watchAddUser, control: addUserControl } = addUserForm;
  const selectedRoleForNewUser = watchAddUser('role');

  const onAddUserSubmit = async (data: NewUserFormData) => {
    const tempAppName = `user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
      const newUser = userCredential.user;
      await updateAuthProfile(newUser, { displayName: data.displayName });

      const userData: any = { displayName: data.displayName, email: data.email, role: data.role, phoneNumber: '' };
      if (data.role === 'User') {
        userData.region = data.regions[0] || '';
      } else {
        userData.regions = data.regions;
      }

      await setDoc(doc(firestore, 'users', newUser.uid), userData);

      toast({ title: 'Success!', description: 'New user created successfully.' });
      addUserForm.reset();
      setIsAddUserOpen(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ variant: 'destructive', title: 'Error creating user', description: error.message || 'An unknown error occurred.' });
    } finally {
      await deleteApp(tempApp);
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage all users in the system.</CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
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
                        <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
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
                                            {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={addUserControl} name="regions" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Region(s)</FormLabel>
                                    {selectedRoleForNewUser === 'User' ? (
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
                                        {selectedRoleForNewUser === 'User' ? 'Assign to a single region.' : "Assign one or more regions."}
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
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.displayName}</TableCell>
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
            roles={roles}
            regions={regions}
            open={!!editingUser}
            onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}
        />
    )}
    </>
  );
}
