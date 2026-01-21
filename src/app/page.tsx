'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) {
      return; // Wait for auth state to be confirmed
    }
    if (user) {
      // Redirect to a generic post-login page.
      // The layout of that page will handle role-based redirection.
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect is handled by the useEffect hook
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: err.message,
      });
    }
  };

  // While loading auth state, or if user is logged in (and we are waiting for redirect), show spinner.
  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center items-center p-4 pb-2">
          <Image src="/logo.png" alt="Cheezious IT Support Logo" width={50} height={50} />
          <div className="pt-2 text-center">
            <CardTitle className="text-2xl font-headline font-bold text-primary whitespace-nowrap">Cheezious IT Support</CardTitle>
            <p className={cn("text-sm text-muted-foreground font-bold", "pt-2 text-base")}>
              Welcome
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleAuthAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full !mt-5">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col pt-2 pb-4" />
      </Card>
    </div>
  );
}
