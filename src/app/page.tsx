'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';


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
  const auth = useAuth();
  const firestore = useFirestore();

  const { user, loading: userLoading } = useUser();
  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (!userLoading && user && !profileLoading) {
      if (userProfile?.role === 'Admin' || userProfile?.role === 'Head') {
        router.push('/admin');
      } else if (userProfile?.role === 'it-support') {
        router.push('/admin/tickets');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, userLoading, userProfile, profileLoading, router]);
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !auth) return;
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: 'Password Reset Email Sent',
            description: `If an account with ${resetEmail} exists, an email has been sent with reset instructions.`,
        });
        setIsResetting(false);
        setIsResetDialogOpen(false);
        setResetEmail('');
    } catch(err: any) {
        toast({
            variant: 'destructive',
            title: 'Password Reset Error',
            description: err.message,
        });
        setIsResetting(false);
    }
  }

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!auth) {
        setError("Auth service not available.");
        setLoading(false);
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // On success, the useEffect hook will handle redirection
    } catch (err: any) {
        let errMessage = "An unknown error occurred.";
        switch (err.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errMessage = 'Invalid email or password.';
                break;
            default:
                errMessage = err.message;
                break;
        }
        setError(errMessage);
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: errMessage,
        });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-gray-950 overflow-hidden px-4">
      {/* Background glows */}
      <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/40 rounded-full blur-3xl opacity-40"></div>
      <div className="absolute bottom-0 translate-y-1/2 left-1/4 -translate-x-1/2 w-96 h-96 bg-purple-500/40 rounded-full blur-3xl opacity-40"></div>
      <div className="absolute bottom-0 translate-y-1/2 right-1/4 translate-x-1/2 w-80 h-80 bg-sky-500/40 rounded-full blur-3xl opacity-40"></div>
      
      <Card className="w-full max-w-sm z-10 border-white/10 bg-gray-900/60 text-white backdrop-blur-md">
        <CardHeader className="text-center items-center p-4 pb-2">
          <Image src="/logo.png" alt="Cheezious IT Support Logo" width={50} height={50} />
          <div className="pt-2 text-center">
            <CardTitle className="text-2xl font-headline font-bold text-primary whitespace-nowrap">Cheezious IT Support</CardTitle>
            <p className={cn("text-sm font-bold text-gray-400", "pt-2 text-base")}>
              Welcome
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleAuthAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/30 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/30 border-white/20 text-white placeholder:text-gray-500"
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
                    <Button variant="link" className="text-sm text-primary/80 hover:text-primary">Forgot Password?</Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Reset Your Password</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Enter your email address and we will send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="reset-email" className="text-gray-300">Email</Label>
                            <Input
                                id="reset-email"
                                type="email"
                                placeholder="m@example.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                                className="bg-black/30 border-white/20 text-white placeholder:text-gray-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className="text-white border-white/20 hover:bg-white/10 hover:text-white">Cancel</Button>
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
