import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardDrive } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            <Link href="/dashboard">Sign In</Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="#" className="underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
