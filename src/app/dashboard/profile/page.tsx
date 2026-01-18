'use client';

import UpdateProfileForm from '@/components/update-profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';


type UserProfile = {
  phoneNumber?: string;
}

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    if (userLoading || profileLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
            </div>
        );
    }

    if (!user) {
        // This should be handled by the layout, but as a safeguard
        return null;
    }

    return (
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div>
                        <CardTitle>Your Profile</CardTitle>
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
                            backLink="/dashboard"
                            backLinkText="Back to Dashboard"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
