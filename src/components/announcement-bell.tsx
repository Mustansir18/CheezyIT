'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { Bell, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
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
    const [isRinging, setIsRinging] = useState(false); // Track animation state
    const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);
    
    const playNotificationSound = useSound('/sounds/new-announcement.mp3');
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
        if (isLoading) return;

        // Initialize ref on first load
        if (prevUnreadCountRef.current === undefined) {
            prevUnreadCountRef.current = unreadCount;
            return;
        }

        // Trigger logic when count increases
        if (unreadCount > prevUnreadCountRef.current) {
            playNotificationSound();
            
            // Trigger the "Ring" animation
            setIsRinging(true);
            const timer = setTimeout(() => setIsRinging(false), 1000); // Stop after 1s
            
            return () => clearTimeout(timer);
        }

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
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell 
                            className={cn(
                                "h-5 w-5 transition-all",
                                // This class is added when a new notification arrives
                                isRinging && "animate-bell-ring text-yellow-500",
                                // Keep the subtle pulse if there are unread items
                                unreadCount > 0 && !isRinging && "animate-pulse text-accent"
                            )} 
                        />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white animate-in zoom-in">
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
                                    <div
                                        className="cursor-pointer group"
                                        onClick={(e) => {
                                            // Prevent button clicks from triggering the dialog
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            if (!n.isRead) {
                                                handleMarkAsRead(n.id);
                                            }
                                            setSelectedNotification(n);
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold group-hover:underline">{n.title}</h4>
                                            {!n.isRead && <span className="h-2 w-2 rounded-full bg-accent mt-1.5" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 truncate">{n.message}</p>
                                    </div>

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
            <Dialog open={!!selectedNotification} onOpenChange={(isOpen) => { if (!isOpen) setSelectedNotification(null); }}>
                <DialogContent className="sm:max-w-lg">
                    {selectedNotification && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedNotification.title}</DialogTitle>
                                <DialogDescription>
                                    Sent {selectedNotification.createdAt ? format(selectedNotification.createdAt.toDate(), 'PPP p') : ''}
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh] pr-4">
                                <div className="py-4 text-sm text-foreground whitespace-pre-wrap">
                                    {selectedNotification.message}
                                </div>
                            </ScrollArea>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button">
                                        Close
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
