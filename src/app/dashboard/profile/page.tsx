'use client';

import UpdateProfileForm from '@/components/update-profile-form';
import ChangePasswordForm from '@/components/change-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';

const useUser = () => {
    const [user, setUser] = useState<{ email: string; displayName: string } | null>(null);
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

export default function ProfilePage() {
    const { user, loading } = useUser();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
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
                            currentDisplayName={user.displayName} 
                            currentPhoneNumber={"03001234567"} 
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
