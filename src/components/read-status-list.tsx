
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, type WithId, useDoc, useUser } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from './ui/skeleton';
import { isAdmin } from '@/lib/admins';

type Announcement = {
    id: string;
    recipientUids: string[];
    readBy: string[];
};

type User = {
    id: string;
    displayName: string;
};

type UserProfile = {
  role?: string;
};

export default function ReadStatusList({ announcement }: { announcement: Announcement }) {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();

    const userProfileRef = useMemoFirebase(() => (currentUser ? doc(firestore, 'users', currentUser.uid) : null), [firestore, currentUser]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isAuthorizedToQueryUsers = useMemo(() => {
        if (!currentUser) return false;
        if (isAdmin(currentUser.email)) return true;
        if (userProfile && (userProfile.role === 'Admin' || userProfile.role === 'it-support')) return true;
        return false;
    }, [currentUser, userProfile]);

    const usersQuery = useMemoFirebase(
        () => (isAuthorizedToQueryUsers ? query(collection(firestore, 'users')) : null),
        [firestore, isAuthorizedToQueryUsers]
    );
    const { data: allUsers, isLoading: usersLoading, error: usersError } = useCollection<User>(usersQuery);

    const usersMap = useMemo(() => {
        if (!allUsers) return new Map<string, string>();
        return new Map(allUsers.map(u => [u.id, u.displayName]));
    }, [allUsers]);

    const isLoading = usersLoading;

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
        );
    }
    
    if (usersError) {
       return <p className="text-destructive text-sm">Error loading user list.</p>
    }

    const recipientUids = announcement.recipientUids || [];
    const readByUids = new Set(announcement.readBy || []);

    if (recipientUids.length === 0) {
        return <p className="text-muted-foreground text-sm">This announcement had no recipients.</p>;
    }
    
    return (
        <ScrollArea className="h-64 rounded-md border">
            <div className="p-4">
                <div className="space-y-2">
                    {recipientUids
                        .map(uid => ({ id: uid, displayName: usersMap.get(uid) || `Unknown User (${uid.substring(0,5)}...)` }))
                        .sort((a,b) => a.displayName.localeCompare(b.displayName))
                        .map(user => {
                            const isRead = readByUids.has(user.id);
                            return (
                                <div key={user.id} className="flex items-center justify-between text-sm">
                                    <span>{user.displayName}</span>
                                    <Badge variant={isRead ? 'default' : 'secondary'}>
                                        {isRead ? 'Read' : 'Unread'}
                                    </Badge>
                                </div>
                            );
                    })}
                </div>
            </div>
        </ScrollArea>
    );
}
