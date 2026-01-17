
'use client';

import { useState, useRef, useEffect }from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access', 'Other'] as const;

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  issueType: z.enum(issueTypes, {
    required_error: "You need to select an issue type.",
  }),
  customIssueType: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
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
type UserProfile = {
    region?: string;
}

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
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<FormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      anydesk: '',
      issueType: undefined,
      customIssueType: '',
    },
  });

  const issueType = form.watch('issueType');

  useEffect(() => {
    if (issueType !== 'Other') {
      form.setValue('customIssueType', '');
    }
  }, [issueType, form]);

  const resetFormState = () => {
    form.reset();
  }
  
  const onSubmit = async (data: FormData) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create a ticket.' });
        return;
    }
    if (!userProfile?.region) {
        toast({ variant: 'destructive', title: 'Region Not Set', description: 'Your account is not assigned to a region. Please contact an administrator.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const ticketData = {
            userId: user.uid,
            title: data.title,
            issueType: data.issueType,
            customIssueType: data.customIssueType || '',
            description: data.description,
            anydesk: data.anydesk || '',
            attachments: [],
            status: 'Pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            unreadByAdmin: true,
            unreadByUser: false,
            region: userProfile.region,
        };

        const ticketsCollectionRef = collection(firestore, 'users', user.uid, 'issues');
        await addDoc(ticketsCollectionRef, ticketData);
        
        toast({ title: 'Success!', description: 'Ticket created successfully!' });
        resetFormState();
        closeButtonRef.current?.click();

    } catch (error: any) {
        console.error("Error creating ticket:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create ticket. Please try again.' });
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
                                <Input placeholder="Please specify the issue type" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            )}
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
