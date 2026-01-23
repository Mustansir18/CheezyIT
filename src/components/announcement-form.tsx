
'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase, type WithId, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, collection, getDocs, query, writeBatch, serverTimestamp, addDoc, collectionGroup } from 'firebase/firestore';
import { isAdmin } from '@/lib/admins';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


const AVAILABLE_ROLES = ['User', 'Branch', 'it-support', 'Admin'];

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
  targetRoles: z.array(z.string()),
  targetRegions: z.array(z.string()),
  targetUsers: z.array(z.string()),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(data => {
    if (data.startDate && data.endDate) {
        const endDate = new Date(data.endDate);
        endDate.setHours(23, 59, 59, 999);
        return endDate > data.startDate;
    }
    return true;
}, {
    message: 'End date must be after the start date.',
    path: ['endDate'],
});

type FormData = z.infer<typeof announcementSchema>;

type User = {
    displayName: string;
    email: string;
    role?: string;
    region?: string;
    regions?: string[];
}

type UserProfile = {
  role?: string;
}

export default function AnnouncementForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [isPending, startTransition] = useTransition();

  const userProfileRef = useMemoFirebase(() => (currentUser ? doc(firestore, 'users', currentUser.uid) : null), [firestore, currentUser]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const isAuthorizedToQueryUsers = useMemo(() => {
      if (!currentUser) return false;
      if (isAdmin(currentUser.email)) return true;
      if (userProfile && (userProfile.role === 'Admin' || userProfile.role === 'it-support')) return true;
      return false;
  }, [currentUser, userProfile]);

  const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);

  const usersQuery = useMemoFirebase(() => (isAuthorizedToQueryUsers ? collection(firestore, 'users') : null), [firestore, isAuthorizedToQueryUsers]);
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
      startDate: undefined,
      endDate: undefined,
    },
  });

  const onSubmit = (data: FormData) => {
    startTransition(() => {
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
        const senderDisplayName = isAdmin(currentUser.email) ? 'Admin' : (currentUser.displayName || 'N/A');

        const announcementPayload = {
            title: data.title,
            message: data.message,
            createdAt: serverTimestamp(),
            createdByUid: currentUser.uid,
            createdByDisplayName: senderDisplayName,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            target: {
                roles: data.targetRoles,
                regions: data.targetRegions,
                users: data.targetUsers,
            },
            recipientUids: recipientUids,
            recipientCount: recipientUids.length,
            readBy: [],
        };
        
        addDoc(collection(firestore, 'announcements'), announcementPayload)
            .then(announcementRef => {
                const batch = writeBatch(firestore);
                const notificationData = {
                    title: data.title,
                    message: data.message,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    announcementId: announcementRef.id,
                    createdByDisplayName: senderDisplayName,
                    startDate: data.startDate || null,
                    endDate: data.endDate || null,
                };

                targetUsers.forEach(user => {
                    const userNotificationRef = doc(collection(firestore, 'users', user.id, 'notifications'));
                    batch.set(userNotificationRef, notificationData);
                });

                return batch.commit().catch(error => {
                    const firstUser = targetUsers[0];
                    const permissionError = new FirestorePermissionError({
                        path: `users/${firstUser?.id || 'some-user'}/notifications`,
                        operation: 'create',
                        requestResourceData: notificationData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    toast({
                        variant: 'destructive',
                        title: 'Error Step 2: Sending to Users',
                        description: 'Master announcement was saved, but failed to send to users. Check write permissions for notifications subcollections.',
                    });
                    throw error;
                });
            })
            .then(() => {
                toast({
                    title: 'Announcement Sent!',
                    description: `Message sent to ${targetUsers.length} user(s).`,
                });
                form.reset();
            })
            .catch(error => {
                if (!error.message?.includes("Sending to Users")) {
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
                }
            });
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a start date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        The announcement will be visible from this date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick an end date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                                if (date) {
                                    date.setHours(23, 59, 59, 999);
                                }
                                field.onChange(date);
                            }}
                            disabled={(date) =>
                              form.getValues('startDate') ? date < form.getValues('startDate')! : false
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        The announcement will expire after this date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

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
