'use client';

import UpdateProfileForm from '@/components/update-profile-form';
import ChangePasswordForm from '@/components/change-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { isRoot } from '@/lib/admins';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type UserProfile = {
  phoneNumber?: string;
}

export default function RootProfilePage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);

    if (userLoading || profileLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
            </div>
        );
    }

    if (!user) {
        // This should be handled by the layout, but as a safeguard
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/root">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                    </Link>
                </Button>
                <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsRoot && "text-primary")}>
                    Your Profile
                </h1>
            </div>
            <div className="flex flex-col items-center gap-6">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <div>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>View and edit your personal information.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium">Email</label>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        
                        <Separator />

                        <div>
                            <UpdateProfileForm 
                                currentDisplayName={user.displayName} 
                                currentPhoneNumber={userProfile?.phoneNumber}
                                backLink="/root"
                                backLinkText="Back to Dashboard"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="w-full max-w-2xl">
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    );
}
