'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useSound } from '@/hooks/use-sound';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { User } from '@/components/user-management';
import type { Announcement } from '@/lib/data';

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
  targetRoles: z.array(z.string()),
  targetUsers: z.array(z.string()),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type FormData = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  users: User[];
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'sentBy' | 'readBy'>) => void;
  currentUser: { email: string; role: string } | null;
}

const ROLES: MultiSelectOption[] = [
    { value: 'User', label: 'User' },
    { value: 'Branch', label: 'Branch' },
    { value: 'it-support', label: 'IT Support' },
    { value: 'Head', label: 'Head' },
    { value: 'Admin', label: 'Admin' },
];


export default function AnnouncementForm({ users, onAddAnnouncement, currentUser }: AnnouncementFormProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const playSound = useSound('/sounds/new-announcement.mp3');

  const userOptions: MultiSelectOption[] = useMemo(() => 
    users.map(u => ({ value: u.id, label: `${u.displayName} (${u.email})` })),
  [users]);

  const form = useForm<FormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      message: '',
      targetRoles: [],
      targetUsers: [],
      startDate: undefined,
      endDate: undefined,
    },
  });

  const onSubmit = (data: FormData) => {
    if (!currentUser) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "You must be logged in to send an announcement."
        });
        return;
    }
    setIsPending(true);

    onAddAnnouncement(data);

    let recipientsSummary = [];
    if (data.targetRoles.length) recipientsSummary.push(`Roles: ${data.targetRoles.join(', ')}`);
    if (data.targetUsers.length) recipientsSummary.push(`Users: ${data.targetUsers.length}`);

    const description = recipientsSummary.length > 0
        ? `Message sent to: ${recipientsSummary.join('; ')}.`
        : 'Message sent to all users.';
    
    playSound();
    setTimeout(() => {
        toast({
            title: 'Announcement Sent!',
            description,
        });
        form.reset();
        setIsPending(false);
    }, 500);
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Compose Announcement</CardTitle>
        <CardDescription>
          Specify the audience for your announcement. If no audience is specified, it will be sent to everyone.
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
            
            <div className="space-y-2 pt-4">
                <h3 className="text-sm font-medium">Target Audience (Optional)</h3>
                <div className="space-y-6">
                    <FormField
                        control={form.control}
                        name="targetRoles"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Roles</FormLabel>
                            <FormControl>
                                <MultiSelect 
                                    options={ROLES}
                                    selected={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select roles..."
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="targetUsers"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Specific Users</FormLabel>
                            <FormControl>
                                <MultiSelect 
                                    options={userOptions}
                                    selected={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select individual users..."
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>


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
            
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Announcement
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
