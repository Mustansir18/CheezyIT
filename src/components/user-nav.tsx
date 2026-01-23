'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

const useUser = () => {
    const [user, setUser] = useState<{ email: string; } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userJson = localStorage.getItem('mockUser');
        if (userJson) {
            setUser(JSON.parse(userJson));
        }
        setLoading(false);
    }, []);

    return { user, loading };
};


export function UserNav() {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    localStorage.removeItem('mockUser');
    router.push('/');
  };

  const handleProfileClick = () => {
    if (pathname.startsWith('/admin')) {
        router.push('/admin/profile');
    } else {
        router.push('/dashboard/profile');
    }
  };

  if (loading) {
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
