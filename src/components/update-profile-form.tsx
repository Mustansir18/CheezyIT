'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(1, { message: 'Display name cannot be empty.' }),
  phoneNumber: z.string()
    .min(11, { message: 'Phone number must be exactly 11 digits.' })
    .max(11, { message: 'Phone number must be exactly 11 digits.' })
    .regex(/^\d{11}$/, { message: 'Phone number must only contain digits.' }),
});

type FormData = z.infer<typeof profileSchema>;

export default function UpdateProfileForm({ 
    currentDisplayName, 
    currentPhoneNumber,
    backLink,
    backLinkText
}: { 
    currentDisplayName?: string | null, 
    currentPhoneNumber?: string,
    backLink: string,
    backLinkText: string
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<FormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: currentDisplayName || '',
      phoneNumber: currentPhoneNumber || '',
    },
  });

  useEffect(() => {
    form.reset({ 
      displayName: currentDisplayName || '',
      phoneNumber: currentPhoneNumber || '' 
    });
  }, [currentDisplayName, currentPhoneNumber, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    if (!user || !auth?.currentUser || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update profile. Not authenticated.' });
        setIsSubmitting(false);
        return;
    }

    try {
        const userDocRef = doc(firestore, 'users', user.uid);
        
        await updateDoc(userDocRef, {
            displayName: data.displayName,
            phoneNumber: data.phoneNumber,
        });

        if (auth.currentUser.displayName !== data.displayName) {
            await updateProfile(auth.currentUser, {
                displayName: data.displayName,
            });
        }
        
        toast({ title: 'Success!', description: 'Your profile has been updated.' });
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your Name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="03000000000"
                  {...field}
                />
              </FormControl>
              <FormDescription>Must be an 11-digit phone number.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-center gap-4 pt-2">
            <Button asChild variant="outline">
                <Link href={backLink}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {backLinkText}
                </Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Profile
            </Button>
        </div>
      </form>
    </Form>
  );
}
