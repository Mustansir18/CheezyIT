
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect }from 'react';

export default function LoginPage() {
  const auth = useAuth();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <HardDrive className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">IssueTrackr</CardTitle>
          <CardDescription>
            Please sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button className="w-full" onClick={handleSignIn}>
              Sign In with Google
            </Button>
        </CardContent>
         <CardFooter className="flex flex-col gap-4">
          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
