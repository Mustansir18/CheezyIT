
'use client';

import { useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting} className="w-full">
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create User
    </Button>
  );
}

export default function CreateBranchUserForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const formRef = useRef<HTMLFormElement>(null);

  const [role, setRole] = useState<'user' | 'branch' | 'admin' | 'it-support'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const displayName = formData.get('displayName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const selectedRole = formData.get('role') as string;
    const branchName = formData.get('branchName') as string | null;
    const phoneNumber = formData.get('phoneNumber') as string | null;

    if (!displayName || !email || !password || !selectedRole) {
        setError('Please fill out all required fields.');
        setIsSubmitting(false);
        return;
    }
    if (selectedRole === 'branch' && !branchName) {
        setError('Branch Name is required for Branch Users.');
        setIsSubmitting(false);
        return;
    }

    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newUser = userCredential.user;

      const userData: any = {
        displayName,
        email,
        role: selectedRole,
      };
      if (selectedRole === 'branch') {
        userData.branchName = branchName;
      }
      if (phoneNumber) {
        userData.phoneNumber = phoneNumber;
      }

      const userDocRef = doc(firestore, 'users', newUser.uid);
      await setDoc(userDocRef, userData);
      
      toast({
        title: 'Success!',
        description: `User account for ${displayName} created.`,
      });
      formRef.current?.reset();
      setRole('user');

    } catch (e: any) {
      console.error('Error creating user:', e);
      let friendlyMessage = 'An unexpected error occurred.';
      if (e.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already in use by another account.';
      } else if (e.code === 'auth/weak-password') {
        friendlyMessage = 'The password is too weak. It must be at least 6 characters long.';
      }
      toast({
        variant: 'destructive',
        title: 'Error Creating User',
        description: friendlyMessage,
      });
      setError(friendlyMessage);
    } finally {
      await deleteApp(tempApp);
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input id="displayName" name="displayName" placeholder="John Doe" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="john.doe@example.com" required />
      </div>
       <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
        <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="e.g. +14155552671" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>
       <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" required defaultValue="user" onValueChange={(value) => setRole(value as any)}>
            <SelectTrigger>
                <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="user">Standard User</SelectItem>
                <SelectItem value="branch">Branch User</SelectItem>
                <SelectItem value="it-support">IT Support</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
        </Select>
      </div>
      {role === 'branch' && (
        <div className="space-y-2">
            <Label htmlFor="branchName">Branch Name</Label>
            <Input id="branchName" name="branchName" placeholder="Main Street Branch" required={role === 'branch'} />
        </div>
      )}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <SubmitButton isSubmitting={isSubmitting} />
    </form>
  );
}
