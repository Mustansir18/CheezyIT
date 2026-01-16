
'use client';

import Image from 'next/image';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
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
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function UserNav() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const avatarImage = PlaceHolderImages.find(img => img.id === 'user-avatar');

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (!user) {
    return null;
  }
  
  const userInitials = user.displayName?.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
             {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  width={40}
                  height={40}
                  alt="User avatar"
                  className="rounded-full"
                />
              ) : avatarImage && (
                <Image
                  src={avatarImage.imageUrl}
                  width={40}
                  height={40}
                  alt="User avatar"
                  data-ai-hint={avatarImage.imageHint}
                  className="rounded-full"
                />
            )}
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
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
