'use client';
import AdminTicketList from '@/components/admin-ticket-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type UserProfile = {
  role?: string;
};

export default function AdminTicketsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const userIsAdmin = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
    const isSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);

    const loading = userLoading || profileLoading;

    if (loading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                {!isSupport && (
                    <Button asChild variant="outline" size="icon">
                        <Link href="/admin">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to Dashboard</span>
                        </Link>
                    </Button>
                )}
                <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsAdmin && "text-primary")}>
                    All Tickets
                </h1>
            </div>
            <AdminTicketList />
        </div>
    );
}
