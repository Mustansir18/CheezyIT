'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export function UserNav() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleProfileClick = () => {
    if (pathname.startsWith('/root')) {
        router.push('/root/profile');
    } else {
        router.push('/dashboard/profile');
    }
  };

  if (userLoading) {
    return <Skeleton className="h-10 w-24" />;
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
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
