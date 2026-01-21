'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { generateAutoReply } from '@/ai/flows/auto-reply-flow';
import { extractTicketInfo } from '@/ai/flows/create-ticket-ai-flow';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSound } from '@/hooks/use-sound';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access', 'Other'] as const;

// Combined schema for all steps
const aiTicketSchema = z.object({
  userDescription: z.string().min(10, 'Please describe your issue in at least 10 characters.'),
  title: z.string().optional(),
  issueType: z.enum(issueTypes).optional(),
  customIssueType: z.string().optional(),
  description: z.string().optional(),
  anydesk: z.string().regex(/^\d*$/, { message: 'AnyDesk ID must be a number.' }).optional(),
});

type FormData = z.infer<typeof aiTicketSchema>;
type UserProfile = {
    region?: string;
}

export default function AITicketCreator({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'describe' | 'confirm'>('describe');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const playNewTicketSound = useSound('/sounds/new-ticket.mp3');

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<FormData>({
    resolver: zodResolver(aiTicketSchema),
    defaultValues: {
      userDescription: '',
      title: '',
      description: '',
      anydesk: '',
      issueType: undefined,
      customIssueType: '',
    },
  });

  const resetFormAndState = () => {
    form.reset();
    setStep('describe');
    setIsGenerating(false);
    setIsSubmitting(false);
  }
  
  const handleGenerateTicket = async () => {
    const userDescription = form.getValues('userDescription');
    if (!userDescription) {
        form.setError('userDescription', { message: 'Please describe your issue.'});
        return;
    }

    setIsGenerating(true);
    try {
        const extractedData = await extractTicketInfo({ userDescription });
        form.setValue('title', extractedData.title);
        form.setValue('issueType', extractedData.issueType);
        form.setValue('customIssueType', extractedData.customIssueType);
        // We use the original user description for the final ticket
        form.setValue('description', userDescription); 
        setStep('confirm');
    } catch (error) {
        console.error("AI ticket generation failed:", error);
        toast({
            variant: 'destructive',
            title: 'AI Assistant Error',
            description: 'Could not generate ticket details. Please fill out the form manually.'
        });
        // Fallback to manual form could be implemented here
    } finally {
        setIsGenerating(false);
    }
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
    if (!data.title || !data.issueType || !data.description) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'AI could not extract all required fields. Please adjust and resubmit.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const newCount = await runTransaction(firestore, async (transaction) => {
            const counterRef = doc(firestore, 'system_settings', 'ticketCounter');
            const counterDoc = await transaction.get(counterRef);
            let count = 1;
            if (counterDoc.exists()) {
                count = counterDoc.data().count + 1;
                transaction.update(counterRef, { count: count });
            } else {
                transaction.set(counterRef, { count: 1 });
            }
            return count;
        });
        
        const ticketId = `TKT-${String(newCount).padStart(6, '0')}`;
        
        const ticketData = {
            userId: user.uid,
            ticketId,
            title: data.title,
            issueType: data.issueType,
            customIssueType: data.issueType === 'Other' ? data.customIssueType || 'Other' : '',
            description: data.description,
            anydesk: data.anydesk || '',
            status: 'Open' as const,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            unreadByAdmin: true,
            unreadByUser: false,
            region: userProfile.region,
        };

        const newTicketRef = await addDoc(collection(firestore, 'users', user.uid, 'issues'), ticketData);

        toast({ title: 'Success!', description: 'Ticket created successfully! An AI assistant will reply shortly.' });
        playNewTicketSound();
        resetFormAndState();
        closeButtonRef.current?.click();

        generateAutoReply({
            title: data.title,
            description: data.description,
            issueType: data.issueType,
        }).then(async (output) => {
            const messagesColRef = collection(newTicketRef, 'messages');
            await addDoc(messagesColRef, {
                userId: 'ai-assistant',
                displayName: 'AI Assistant',
                text: output.replyText,
                createdAt: serverTimestamp(),
                isRead: false,
                type: 'user',
            });
            await updateDoc(newTicketRef, { unreadByUser: true });
        }).catch(err => {
            console.error("Error generating AI reply:", err);
        });

    } catch (error: any) {
        console.error("Error creating ticket:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create ticket. Please try again.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && resetFormAndState()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className='font-headline flex items-center gap-2'><Sparkles className="h-5 w-5 text-accent" /> AI Ticket Assistant</DialogTitle>
          <DialogDescription>
            {step === 'describe'
                ? "Just describe your problem in plain English, and our AI will create the ticket for you."
                : "The AI has drafted a ticket for you. Please review and confirm."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {step === 'describe' && (
                <FormField
                    control={form.control}
                    name="userDescription"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Describe your issue</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="e.g., I can't log in to my email account, it says my password has expired."
                                rows={6}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {step === 'confirm' && (
                <>
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Issue Title</FormLabel>
                            <FormControl>
                                <Input {...field} />
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
                    {form.watch('issueType') === 'Other' && (
                        <FormField
                            control={form.control}
                            name="customIssueType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom Issue Type</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    rows={5}
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
                </>
            )}

            <DialogFooter>
               <DialogClose asChild>
                <Button ref={closeButtonRef} variant="outline" onClick={resetFormAndState}>Cancel</Button>
               </DialogClose>
               {step === 'describe' ? (
                    <Button type="button" onClick={handleGenerateTicket} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Generate Ticket
                    </Button>
               ) : (
                    <>
                        <Button type="button" variant="secondary" onClick={() => setStep('describe')}>Back</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Ticket
                        </Button>
                    </>
               )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
