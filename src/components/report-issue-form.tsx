'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useSound } from '@/hooks/use-sound';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp, getDocs } from 'firebase/firestore';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access', 'Other'] as const;

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  issueType: z.enum(issueTypes, {
    required_error: "You need to select an issue type.",
  }),
  customIssueType: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  region: z.string({ required_error: 'Region is required.' }),
  anydesk: z.string().regex(/^\d*$/, { message: 'AnyDesk ID must be a number.' }).optional(),
}).refine(data => {
    if (data.issueType === 'Other') {
        return !!data.customIssueType && data.customIssueType.length > 0;
    }
    return true;
}, {
    message: 'Please specify your issue type.',
    path: ['customIssueType'],
});

type FormData = z.infer<typeof ticketSchema>;

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create Ticket
    </Button>
  );
}

export default function ReportIssueForm({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const playSound = useSound('/sounds/new-announcement.mp3');

  const { user } = useUser();
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const form = useForm<FormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      anydesk: '',
      issueType: undefined,
      customIssueType: '',
      region: undefined,
    },
  });

  const issueType = form.watch('issueType');
  const userRegions = userProfile?.regions?.filter((r: string) => r !== 'all') || [];

  useEffect(() => {
    if (issueType !== 'Other') {
      form.setValue('customIssueType', '');
    }
  }, [issueType, form]);
  
  useEffect(() => {
      if (userRegions.length === 1) {
          form.setValue('region', userRegions[0]);
      }
  }, [userRegions, form])

  const resetFormState = () => {
    form.reset();
  }
  
  const onSubmit = async (data: FormData) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const ticketsCollectionRef = collection(firestore, 'tickets');
        const snapshot = await getDocs(ticketsCollectionRef);
        const nextTicketNumber = (snapshot.size + 1).toString().padStart(3, '0');

        await addDoc(ticketsCollectionRef, {
            ticketId: `TKT-${nextTicketNumber}`,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'Open',
            title: data.title,
            description: data.description,
            issueType: data.issueType === 'Other' ? data.customIssueType! : data.issueType,
            customIssueType: data.issueType === 'Other' ? data.customIssueType : undefined,
            anydesk: data.anydesk || null,
            region: data.region,
        });

        playSound();
        toast({ title: 'Success!', description: 'Your ticket has been created successfully.' });
        resetFormState();
        closeButtonRef.current?.click();
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to create ticket: ${err.message}` });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && resetFormState()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className='font-headline'>Report a New Issue</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit a new Cheezious IT Support ticket.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cannot connect to Wi-Fi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="issueType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an issue type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {issueTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                {issueType === 'Other' && (
                     <FormField
                        control={form.control}
                        name="customIssueType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Custom Issue Type</FormLabel>
                                <FormControl>
                                    <Input placeholder="Please specify" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                )}
                 {userRegions.length > 1 && (
                    <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a region" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {userRegions.map((region: string) => (
                                <SelectItem key={region} value={region}>{region}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide as much detail as possible."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="anydesk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AnyDesk Address (Optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" pattern="[0-9]*" placeholder="123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
               <DialogClose asChild>
                <Button ref={closeButtonRef} variant="outline" onClick={resetFormState}>Cancel</Button>
               </DialogClose>
               <SubmitButton isSubmitting={isSubmitting} />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
