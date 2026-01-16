'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useCollection, useMemoFirebase, type WithId } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { sendAnnouncementAction } from '@/lib/actions';

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
}

export default function AnnouncementForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
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
      const result = await sendAnnouncementAction(data);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error Sending Announcement',
          description: result.error,
        });
      } else if (result.success) {
        toast({
          title: 'Announcement Sent!',
          description: result.success,
        });
        form.reset();
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
