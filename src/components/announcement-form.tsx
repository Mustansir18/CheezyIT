'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase, type WithId, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, getDocs, query, writeBatch, serverTimestamp, addDoc, collectionGroup } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const AVAILABLE_ROLES = ['User', 'Branch', 'it-support', 'Admin'];

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
  targetRoles: z.array(z.string()),
  targetRegions: z.array(z.string()),
  targetUsers: z.array(z.string()),
});

type FormData = z.infer<typeof announcementSchema>;

type User = {
    displayName: string;
    email: string;
    role?: string;
    region?: string;
    regions?: string[];
}

export default function AnnouncementForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [isPending, startTransition] = useTransition();

  const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);

  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: usersData, isLoading: usersLoading } = useCollection<WithId<User>>(usersQuery);

  const availableRegions = regionsData?.list?.map(r => ({ value: r, label: r })) || [];
  const availableRoles = AVAILABLE_ROLES.map(r => ({ value: r, label: r }));
  const availableUsers = useMemo(() => {
    if (!usersData) return [];
    return usersData
      .map(u => ({ value: u.id, label: `${u.displayName} (${u.email})`}))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [usersData]);

  const form = useForm<FormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      message: '',
      targetRoles: [],
      targetRegions: [],
      targetUsers: [],
    },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Admin user not authenticated.' });
            return;
        }
        if (!usersData) {
            toast({ variant: 'destructive', title: 'User data not loaded', description: 'Please wait a moment and try again.' });
            return;
        }

        let targetUsers: WithId<User>[] = [];
        if (data.targetUsers && data.targetUsers.length > 0) {
            targetUsers = usersData.filter(user => data.targetUsers.includes(user.id));
        } else {
            let filteredUsers = usersData;
            if (data.targetRoles.length > 0) {
                filteredUsers = filteredUsers.filter(user => user.role && data.targetRoles.includes(user.role));
            }
            if (data.targetRegions.length > 0) {
                filteredUsers = filteredUsers.filter(user => {
                    const userRegions = (Array.isArray(user.regions) && user.regions.length > 0) ? user.regions : (user.region ? [user.region] : []);
                    return userRegions.some((r: string) => data.targetRegions.includes(r));
                });
            }
            targetUsers = filteredUsers;
        }

        if (targetUsers.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Recipients',
                description: 'No users found matching the selected criteria.',
            });
            return;
        }
        
        const recipientUids = targetUsers.map(user => user.id);

        const announcementPayload = {
            title: data.title,
            message: data.message,
            createdAt: serverTimestamp(),
            createdByUid: currentUser.uid,
            createdByDisplayName: currentUser.displayName || 'N/A',
            target: {
                roles: data.targetRoles,
                regions: data.targetRegions,
                users: data.targetUsers,
            },
            recipientUids: recipientUids,
            recipientCount: recipientUids.length,
            readBy: [],
        };

        let announcementRef;
        try {
            announcementRef = await addDoc(collection(firestore, 'announcements'), announcementPayload);
        } catch (error: any) {
            console.error("Error creating master announcement:", error);
            const permissionError = new FirestorePermissionError({
                path: 'announcements',
                operation: 'create',
                requestResourceData: announcementPayload,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: 'destructive',
                title: 'Error Step 1: Saving Announcement',
                description: 'Could not save the master announcement. Check permissions for the /announcements collection.',
            });
            return;
        }

        try {
            const batch = writeBatch(firestore);
            const notificationData = {
                title: data.title,
                message: data.message,
                createdAt: serverTimestamp(),
                isRead: false,
                announcementId: announcementRef.id,
            };

            targetUsers.forEach(user => {
                const userNotificationRef = doc(collection(firestore, 'users', user.id, 'notifications'));
                batch.set(userNotificationRef, notificationData);
            });

            await batch.commit();

            toast({
                title: 'Announcement Sent!',
                description: `Message sent to ${targetUsers.length} user(s).`,
            });
            form.reset();

        } catch (error: any) {
            console.error("Error fanning out notifications:", error);
            const firstUser = targetUsers[0];
            const notificationData = {
                title: data.title, message: data.message, createdAt: 'SERVER_TIMESTAMP', isRead: false, announcementId: announcementRef.id
            };
            const permissionError = new FirestorePermissionError({
                path: `users/${firstUser?.id || 'some-user'}/notifications`,
                operation: 'create',
                requestResourceData: notificationData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: 'destructive',
                title: 'Error Step 2: Sending to Users',
                description: 'Master announcement was saved, but failed to send to users. Check permissions for notifications subcollections.',
            });
        }
    });
  };

  const isLoading = regionsLoading || usersLoading;

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Compose Announcement</CardTitle>
        <CardDescription>
          Send a message to specific users, or broadcast to users based on their role and/or region.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Scheduled Maintenance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Please provide details about the announcement..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-2 pt-2'>
                <FormLabel>Targeting Options</FormLabel>
                <FormDescription>
                    If specific users are selected, the announcement will ONLY be sent to them. Otherwise, it will be sent to users matching the selected roles and regions.
                </FormDescription>
            </div>
            
            <FormField
                control={form.control}
                name="targetUsers"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Specific Users (Highest Priority)</FormLabel>
                    <MultiSelect
                        options={availableUsers}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select individual users..."
                    />
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-card px-2 text-sm text-muted-foreground">OR</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="targetRoles"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Roles</FormLabel>
                    <MultiSelect
                        options={availableRoles}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select roles..."
                    />
                    <FormDescription>Leave blank for all roles.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="targetRegions"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Regions</FormLabel>
                    <MultiSelect
                        options={availableRegions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select regions..."
                    />
                    <FormDescription>Leave blank for all regions.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending || isLoading}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Announcement
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
