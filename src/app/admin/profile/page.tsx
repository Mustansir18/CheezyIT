'use client';

import UpdateProfileForm from '@/components/update-profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Loader2, ArrowLeft } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


type UserProfile = {
  phoneNumber?: string;
}

export default function AdminProfilePage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    if (userLoading || profileLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        // This should be handled by the layout, but as a safeguard
        return null;
    }

    return (
        <div className="space-y-4">
            <Button asChild variant="outline">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin Dashboard
                </Link>
            </Button>
            <div className="flex justify-center">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>{user.displayName}</CardTitle>
                        <CardDescription>View and edit your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium">Display Name</label>
                                <p className="text-sm text-muted-foreground">{user.displayName}</p>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label className="text-sm font-medium">Email</label>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        
                        <Separator />

                        <div>
                            <UpdateProfileForm currentPhoneNumber={userProfile?.phoneNumber} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
