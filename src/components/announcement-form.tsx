
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { sendAnnouncementAction } from '@/lib/actions';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Loader2 } from 'lucide-react';

const AVAILABLE_ROLES = ['User', 'Branch', 'it-support', 'Admin'];

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
  targetRoles: z.array(z.string()),
  targetRegions: z.array(z.string()),
});

type FormData = z.infer<typeof announcementSchema>;

export default function AnnouncementForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPending, startTransition] = useTransition();

  const regionsRef = useMemoFirebase(() => doc(firestore, 'system_settings', 'regions'), [firestore]);
  const { data: regionsData, isLoading: regionsLoading } = useDoc<{ list: string[] }>(regionsRef);

  const availableRegions = regionsData?.list?.map(r => ({ value: r, label: r })) || [];
  const availableRoles = AVAILABLE_ROLES.map(r => ({ value: r, label: r }));

  const form = useForm<FormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      message: '',
      targetRoles: [],
      targetRegions: [],
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

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Compose Announcement</CardTitle>
        <CardDescription>
          Create a message to broadcast to specific users. If no roles or regions are selected, the announcement will be sent to everyone.
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
                    <FormDescription>Leave blank to target all roles.</FormDescription>
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
                    <FormDescription>Leave blank to target all regions.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending || regionsLoading}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Announcement
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
