
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, type WithId } from '@/firebase';
import { collection, query, collectionGroup, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

type User = {
    id: string;
    displayName: string;
};

type UserNotification = {
    userId: string;
    isRead: boolean;
};

export default function ReadStatusList({ announcementId }: { announcementId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const usersQuery = useMemoFirebase(
        () => query(collection(firestore, 'users')),
        [firestore]
    );
    const { data: allUsers, isLoading: usersLoading, error: usersError } = useCollection<User>(usersQuery);

    const notificationsQuery = useMemoFirebase(
        () => query(collectionGroup(firestore, 'notifications'), where('announcementId', '==', announcementId)),
        [firestore, announcementId]
    );
    // Note: This query requires a composite index in Firestore.
    // The console error will provide a link to create it.
    const { data: notifications, isLoading: notificationsLoading, error: notificationsError } = useCollection<UserNotification>(notificationsQuery);
    
    // Show a toast if a permission error occurs on the collection group query
    useMemo(() => {
        if (notificationsError?.message.includes('permission-denied')) {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: 'You may be missing a required Firestore index for this query. Check the browser console for a link to create it.'
            });
        }
    }, [notificationsError, toast]);


    const readStatusMap = useMemo(() => {
        if (!notifications) return new Map();
        return new Map(notifications.map(n => [n.userId, n.isRead]));
    }, [notifications]);

    const isLoading = usersLoading || notificationsLoading;

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
        );
    }
    
    if (usersError || notificationsError) {
        return <p className="text-destructive text-sm">Error loading read status. You might be missing a required Firestore index. Check the console.</p>
    }

    if (!allUsers || allUsers.length === 0) {
        return <p className="text-muted-foreground text-sm">No users found.</p>;
    }

    return (
        <ScrollArea className="h-64 rounded-md border">
            <div className="p-4">
                <div className="space-y-2">
                    {allUsers
                        .sort((a,b) => a.displayName.localeCompare(b.displayName))
                        .map(user => {
                            const isRead = readStatusMap.get(user.id) || false;
                            return (
                                <div key={user.id} className="flex items-center justify-between text-sm">
                                    <span>{user.displayName}</span>
                                    <Badge variant={isRead ? 'default' : 'secondary'} className={isRead ? 'bg-green-600 hover:bg-green-700' : ''}>
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
