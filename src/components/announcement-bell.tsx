
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { Bell, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/use-sound';

type UserNotification = {
    id: string;
    title: string;
    message: string;
    createdAt: any; // Firestore timestamp
    isRead: boolean;
};

export default function AnnouncementBell() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    
    const playNotificationSound = useSound('/notification.mp3');
    const prevUnreadCountRef = useRef<number | undefined>(undefined);

    const notificationsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc')) : null,
        [firestore, user]
    );
    const { data: notifications, isLoading } = useCollection<UserNotification>(notificationsQuery);

    const unreadCount = useMemo(() => {
        if (!notifications) return 0;
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    useEffect(() => {
        // On initial load, set the ref to the current count without playing a sound.
        if (prevUnreadCountRef.current === undefined && !isLoading) {
            prevUnreadCountRef.current = unreadCount;
            return;
        }

        // Play sound only when the unread count increases from its previous state.
        if (!isLoading && prevUnreadCountRef.current !== undefined && unreadCount > prevUnreadCountRef.current) {
            playNotificationSound();
        }

        // Update the ref with the new count for the next render.
        prevUnreadCountRef.current = unreadCount;
    }, [unreadCount, isLoading, playNotificationSound]);

    const handleMarkAsRead = async (notificationId: string) => {
        if (!user) return;
        const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
        try {
            await updateDoc(notificationRef, { isRead: true });
        } catch (error) {
            console.error("Failed to mark as read:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update notification.' });
        }
    };
    
    const handleDeleteNotification = async (notificationId: string) => {
        if (!user) return;
        const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
        try {
            await deleteDoc(notificationRef);
            toast({ title: 'Deleted', description: 'Notification removed.'});
        } catch (error) {
            console.error("Failed to delete notification:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove notification.' });
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user || !notifications) return;
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(firestore);
        unreadNotifications.forEach(n => {
            const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { isRead: true });
        });
        try {
            await batch.commit();
            toast({ title: 'Success', description: 'All notifications marked as read.' });
        } catch (error) {
             console.error("Failed to mark all as read:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not mark all as read.' });
        }
    }

    if (!user) return null;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className={cn("h-5 w-5", unreadCount > 0 && "animate-pulse text-accent")} />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white hover:bg-red-500/90">
                            {unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Announcements</SheetTitle>
                    <SheetDescription>
                        You have {unreadCount} unread announcements.
                    </SheetDescription>
                </SheetHeader>
                <Separator />
                <ScrollArea className="flex-1 -mx-6">
                    <div className="px-6 py-4 space-y-4">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : notifications && notifications.length > 0 ? (
                        notifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-lg border ${n.isRead ? 'bg-card/50' : 'bg-card'}`}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold">{n.title}</h4>
                                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-accent mt-1.5" />}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                                <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                                    <span>
                                        {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ''}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {!n.isRead && (
                                            <Button variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => handleMarkAsRead(n.id)}>
                                                Mark as Read
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteNotification(n.id)}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete Notification</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <Bell className="mx-auto h-12 w-12" />
                            <p className="mt-4">You have no announcements.</p>
                        </div>
                    )}
                    </div>
                </ScrollArea>
                <SheetFooter>
                    <Button variant="outline" className="w-full" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                        Mark All as Read
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
