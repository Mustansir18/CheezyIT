
'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { isAdmin } from '@/lib/admins';
import { UserNav } from '@/components/user-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreateBranchUserForm from '@/components/create-branch-user-form';
import UserList from '@/components/user-list';

export default function AdminPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin(user.uid)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin(user.uid)) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>You are not authorized to view this page.</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold font-headline"
        >
          <Image src="/logo.png" alt="IssueTrackr Logo" width={32} height={32} />
          <span>IssueTrackr</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Admin Dashboard
          </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
               <UserList />
            </div>
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                    <CardTitle>Create Branch User</CardTitle>
                    <CardDescription>Create a new user with the 'branch' role.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateBranchUserForm />
                </CardContent>
              </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
