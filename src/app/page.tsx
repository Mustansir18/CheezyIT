'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const user = localStorage.getItem('mockUser');
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role === 'Admin') {
          router.push('/admin');
      } else if (parsedUser.role === 'it-support') {
          router.push('/admin/tickets');
      } else {
          router.push('/dashboard');
      }
    }
  }, [router]);
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsResetting(true);
    // Mock password reset
    setTimeout(() => {
        toast({
            title: 'Password Reset Email Sent',
            description: `If an account with ${resetEmail} exists, an email has been sent with reset instructions.`,
        });
        setIsResetting(false);
        setIsResetDialogOpen(false);
        setResetEmail('');
    }, 1000);
  }

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Mock login
    setTimeout(() => {
        if (email === 'mustansir133@gmail.com' && password === 'PAK!7tan') {
            localStorage.setItem('mockUser', JSON.stringify({ email, displayName: 'Admin', role: 'Admin' }));
            router.push('/admin');
        } else if (email === 'support@example.com' && password === 'password') {
            localStorage.setItem('mockUser', JSON.stringify({ email, displayName: 'Support Person', role: 'it-support' }));
            router.push('/admin/tickets');
        } else if (email && password) {
            localStorage.setItem('mockUser', JSON.stringify({ email, displayName: 'Demo User', role: 'User' }));
            router.push('/dashboard');
        } else {
            const errMessage = 'Invalid credentials';
            setError(errMessage);
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: errMessage,
            });
        }
        setLoading(false);
    }, 1000);
  };

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
            <Button type="submit" className="w-full !mt-5" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col pt-2 pb-4">
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="link" className="text-sm">Forgot Password?</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Your Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address and we will send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                                id="reset-email"
                                type="email"
                                placeholder="m@example.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isResetting}>
                                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
