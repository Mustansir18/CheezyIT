
'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { createBranchUserAction } from '@/lib/actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const initialState = {
  type: '',
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create User
    </Button>
  );
}

export default function CreateBranchUserForm() {
  const [state, formAction] = useActionState(createBranchUserAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<'user' | 'branch' | 'admin' | 'it-support'>('user');

  useEffect(() => {
    if (state?.type === 'success') {
      toast({
        title: 'Success!',
        description: state.message,
      });
      formRef.current?.reset();
      setRole('user');
    } else if (state?.type === 'error') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input id="displayName" name="displayName" placeholder="John Doe" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="john.doe@example.com" required />
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
            <Input id="branchName" name="branchName" placeholder="Main Street Branch" required />
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
