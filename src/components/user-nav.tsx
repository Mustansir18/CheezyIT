'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  role: string;
};

export function UserNav() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isPrivilegedUser = useMemo(() => {
    if (!user) return false;
    return isRoot(user.email) || userProfile?.role === 'it-support' || userProfile?.role === 'Admin';
  }, [user, userProfile]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleProfileClick = () => {
    if (isPrivilegedUser) {
      router.push('/admin/profile');
    } else {
      router.push('/dashboard/profile');
    }
  };

  if (userLoading || profileLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="bg-yellow-400 text-black hover:bg-yellow-500">
          Profile
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end" forceMount>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick}>
            See Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
