'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useAuth, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(1, { message: 'Display name cannot be empty.' }),
  phoneNumber: z.string()
    .min(11, { message: 'Phone number must be exactly 11 digits.' })
    .max(11, { message: 'Phone number must be exactly 11 digits.' })
    .regex(/^\d{11}$/, { message: 'Phone number must only contain digits.' })
    .optional()
    .or(z.literal('')),
});

type FormData = z.infer<typeof profileSchema>;

export default function UpdateProfileForm({ currentDisplayName, currentPhoneNumber }: { currentDisplayName?: string | null, currentPhoneNumber?: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!user || !auth.currentUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to update your profile.' });
        return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const updateData = { 
        displayName: data.displayName,
        phoneNumber: data.phoneNumber || '' 
    };

    try {
        if (auth.currentUser.displayName !== data.displayName) {
          await updateProfile(auth.currentUser, { displayName: data.displayName });
        }
        await setDoc(userDocRef, updateData, { merge: true });
        toast({ title: 'Success!', description: 'Your profile has been updated.' });
    } catch (error: any) {
        console.error("Error updating profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile. You may not have permission.' });
        
        const contextualError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'write',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', contextualError);
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
              <FormDescription>Must be 11 digits. Leave blank to remove.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Profile
        </Button>
      </form>
    </Form>
  );
}
