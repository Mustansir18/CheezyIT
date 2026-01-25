'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { logActivity } from '@/lib/activity-logger';
import Image from 'next/image';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!auth || !firestore) {
        setError("Auth service not available.");
        setLoading(false);
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const loggedInUser = userCredential.user;

        // Fetch user profile to log activity with user's name
        const userProfileDoc = await getDoc(doc(firestore, 'users', loggedInUser.uid));

        if (userProfileDoc.exists()) {
            const userProfileData = userProfileDoc.data();
            logActivity(firestore, {
                userId: loggedInUser.uid,
                userName: userProfileData.displayName || loggedInUser.email || 'Unknown',
                action: 'USER_LOGIN',
                details: `User logged in successfully.`
            });
        }
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
    <div className="relative flex h-screen w-full items-center justify-center bg-[#09090B] overflow-hidden px-4">
      {/* Background glows */}
      <div className="absolute -z-10 top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -z-10 bottom-0 translate-y-1/2 left-1/4 -translate-x-1/2 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -z-10 bottom-0 translate-y-1/2 right-1/4 translate-x-1/2 w-80 h-80 bg-sky-500/30 rounded-full blur-3xl opacity-50"></div>
      
      <div className="relative w-full max-w-sm z-10">
        <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-orange-500 via-purple-500 to-sky-500 opacity-70 blur-md"></div>
        <Card className="relative bg-zinc-900 text-white rounded-xl border border-zinc-800">
          <CardHeader className="text-center items-center p-6">
            <div className="flex flex-col items-center justify-center gap-4 py-4">
                <Image src="/logo.png" alt="Cheezious Logo" width={150} height={150} className="rounded-full" />
                <div className="flex flex-col items-center">
                    <span className="font-bold text-5xl font-headline text-primary">Cheezious</span>
                    <span className="text-lg font-headline text-white">IT Support</span>
                </div>
            </div>
            <CardDescription className="text-zinc-400 pt-2">
              Sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <form onSubmit={handleAuthAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-400">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 placeholder:text-zinc-500"
                />
              </div>
              <Button type="submit" className="w-full !mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col pt-2 pb-6 px-6">
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
