'use client';

import UpdateProfileForm from '@/components/update-profile-form';
import ChangePasswordForm from '@/components/change-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type UserProfile = {
  phoneNumber?: string;
  displayName: string;
};

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const loading = userLoading || profileLoading;

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-6">
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
                            currentDisplayName={userProfile?.displayName} 
                            currentPhoneNumber={userProfile?.phoneNumber} 
                            backLink="/dashboard"
                            backLinkText="Back to Dashboard"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="w-full max-w-2xl">
                <ChangePasswordForm />
            </div>
        </div>
    );
}
