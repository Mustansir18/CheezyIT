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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
    return <Skeleton className="h-8 w-24" />;
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          {user.displayName || user.email}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {user.displayName && <p className="text-sm font-medium leading-none">{user.displayName}</p>}
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick}>
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
