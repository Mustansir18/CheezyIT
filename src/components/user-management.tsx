'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus, MoreHorizontal, Pencil, ShieldBan, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { isAdmin as isRootAdmin } from '@/lib/admins';

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: 'User' | 'it-support' | 'Admin' | 'Branch' | 'Head';
  region?: string;
  regions?: string[];
  blockedUntil?: Date | null;
};

const userSchema = z.object({
  id: z.string().optional(),
  displayName: z.string().min(1, 'Display name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  role: z.enum(['User', 'it-support', 'Admin', 'Branch', 'Head']),
  region: z.string().optional(),
  regions: z.array(z.string()).optional(),
}).refine(data => {
    if (data.role === 'User' && !data.region) return false;
    return true;
}, { message: 'Region is required for User role.', path: ['region']})
.refine(data => {
    if ((data.role === 'it-support' || data.role === 'Admin' || data.role === 'Branch' || data.role === 'Head') && (!data.regions || data.regions.length === 0)) return false;
    return true;
}, { message: 'At least one region is required for this role.', path: ['regions']});


export default function UserManagement({ 
    userIsAdminOrRoot: isPrivileged, 
    regions: regionList,
    users,
    onSaveUser,
    onBlockUser
}: { 
    userIsAdminOrRoot: boolean, 
    regions: string[],
    users: User[],
    onSaveUser: (data: z.infer<typeof userSchema>) => void,
    onBlockUser: (user: User) => void
}) {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [blockingUser, setBlockingUser] = useState<User | null>(null);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const isLoading = false;
    
    const regionOptions: MultiSelectOption[] = useMemo(() => (
      regionList.map(r => ({ value: r, label: r }))
    ), [regionList]);

    const handleOpenAddDialog = () => {
        setEditingUser(null);
        setIsUserDialogOpen(true);
    };

    const handleOpenEditDialog = (user: User) => {
        setEditingUser(user);
        setIsUserDialogOpen(true);
    };
    
    const handleSaveUser = (data: z.infer<typeof userSchema>) => {
        onSaveUser(data);
        setIsUserDialogOpen(false);
    };
    
    const handleConfirmBlock = () => {
        if (!blockingUser) return;
        onBlockUser(blockingUser);
        setBlockingUser(null);
    };
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>User Accounts</CardTitle>
                            <CardDescription>Firebase is detached. This is a mock user list.</CardDescription>
                        </div>
                         <Button onClick={handleOpenAddDialog}>
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
                                users.map((user) => {
                                    const isUserAdmin = isRootAdmin(user.email);
                                    const isBlocked = user.blockedUntil && user.blockedUntil > new Date();
                                    return (
                                        <TableRow key={user.id} className={isBlocked ? 'bg-destructive/10' : ''}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {user.displayName}
                                                {isBlocked && <Badge variant="destructive">Blocked</Badge>}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell><Badge variant={user.role === 'it-support' || user.role === 'Admin' ? 'secondary' : 'outline'}>{user.role}</Badge></TableCell>
                                            <TableCell>{user.regions?.includes('all') ? 'All' : (user.region || user.regions?.join(', '))}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isUserAdmin}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleOpenEditDialog(user)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setBlockingUser(user)}>
                                                            {isBlocked ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldBan className="mr-2 h-4 w-4" />}
                                                            {isBlocked ? 'Unblock' : 'Block'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <UserFormDialog 
                isOpen={isUserDialogOpen} 
                setIsOpen={setIsUserDialogOpen} 
                user={editingUser} 
                onSave={handleSaveUser}
                regions={regionOptions}
            />

            {blockingUser && (
                <AlertDialog open={!!blockingUser} onOpenChange={(open) => !open && setBlockingUser(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You are about to {blockingUser.blockedUntil && blockingUser.blockedUntil > new Date() ? 'unblock' : 'block'} the user "{blockingUser.displayName}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setBlockingUser(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmBlock}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

function UserFormDialog({ isOpen, setIsOpen, user, onSave, regions }: { isOpen: boolean, setIsOpen: (open: boolean) => void, user: User | null, onSave: (data: z.infer<typeof userSchema>) => void, regions: MultiSelectOption[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      id: user?.id || undefined,
      displayName: user?.displayName || '',
      email: user?.email || '',
      role: user?.role || 'User',
      region: user?.region || '',
      regions: user?.regions || [],
      password: '',
    },
  });

  useEffect(() => {
    form.reset({
      id: user?.id || undefined,
      displayName: user?.displayName || '',
      email: user?.email || '',
      role: user?.role || 'User',
      region: user?.region || '',
      regions: user?.regions || [],
      password: '',
    });
  }, [user, form]);
  
  const watchedRole = form.watch('role');

  const onSubmit = (data: z.infer<typeof userSchema>) => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      onSave(data);
      setIsSubmitting(false);
    }, 500);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {user ? `Update the details for ${user.displayName}.` : 'Fill in the details to create a new user.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={!!user} /></FormControl><FormMessage /></FormItem>
            )}/>
            {!user && (
                 <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            )}
             <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="User">User</SelectItem>
                            <SelectItem value="Branch">Branch</SelectItem>
                            <SelectItem value="it-support">IT Support</SelectItem>
                            <SelectItem value="Head">Head</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>
             )}/>
             
             {['Admin', 'it-support', 'Branch', 'Head'].includes(watchedRole) && (
                <FormField control={form.control} name="regions" render={({ field }) => (
                    <FormItem><FormLabel>Regions</FormLabel>
                        <FormControl>
                            <MultiSelect 
                                options={regions}
                                selected={field.value || []}
                                onChange={field.onChange}
                                placeholder="Select regions..."
                            />
                        </FormControl>
                    <FormMessage /></FormItem>
                )}/>
             )}

             {watchedRole === 'User' && (
                <FormField control={form.control} name="region" render={({ field }) => (
                    <FormItem><FormLabel>Region</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a region" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {regions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
             )}
            
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
