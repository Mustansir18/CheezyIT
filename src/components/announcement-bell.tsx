
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, deleteDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import { Bell, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
    announcementId?: string;
    createdByDisplayName?: string;
    startDate?: any;
    endDate?: any;
};

export default function AnnouncementBell() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isRinging, setIsRinging] = useState(false); // Track animation state
    
    const playNotificationSound = useSound('/sounds/new-announcement.mp3');
    const prevUnreadCountRef = useRef<number | undefined>(undefined);

    const notificationsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc')) : null,
        [firestore, user]
    );
    const { data: notifications, isLoading } = useCollection<UserNotification>(notificationsQuery);

    const visibleNotifications = useMemo(() => {
        if (!notifications) return [];
        const now = new Date();
        return notifications.filter(n => {
            const start = n.startDate ? n.startDate.toDate() : null;
            const end = n.endDate ? n.endDate.toDate() : null;

            if (start && now < start) return false; // Not yet started
            if (end && now > end) return false; // Expired
            
            return true;
        });
    }, [notifications]);

    const unreadCount = useMemo(() => {
        if (!visibleNotifications) return 0;
        return visibleNotifications.filter(n => !n.isRead).length;
    }, [visibleNotifications]);

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

    const handleMarkAsRead = async (notification: UserNotification) => {
        if (!user || !notification || notification.isRead) return;

        const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
        
        try {
            const batch = writeBatch(firestore);

            // Mark the user's personal notification as read
            batch.update(notificationRef, { isRead: true });

            // If it's a broadcast announcement, also update the central read status
            if (notification.announcementId) {
                const announcementRef = doc(firestore, 'announcements', notification.announcementId);
                batch.update(announcementRef, {
                    readBy: arrayUnion(user.uid)
                });
            }

            await batch.commit();
        } catch (error) {
            console.error("Failed to mark as read:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update notification status.' });
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
        if (!user || !visibleNotifications) return;
        const unreadNotifications = visibleNotifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(firestore);
        
        unreadNotifications.forEach(n => {
            const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { isRead: true });

            if (n.announcementId) {
                const announcementRef = doc(firestore, 'announcements', n.announcementId);
                batch.update(announcementRef, {
                    readBy: arrayUnion(user.uid)
                });
            }
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
                    {isLoading ? (
                        <div className="px-6 py-4 space-y-2">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                        </div>
                    ) : visibleNotifications && visibleNotifications.length > 0 ? (
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full px-6 py-4 space-y-2"
                            onValueChange={(value) => {
                                if (value && visibleNotifications) {
                                    const notificationToRead = visibleNotifications.find(n => n.id === value);
                                    if (notificationToRead && !notificationToRead.isRead) {
                                        handleMarkAsRead(notificationToRead);
                                    }
                                }
                            }}
                        >
                            {visibleNotifications.map(n => (
                                <AccordionItem value={n.id} key={n.id} className={`border rounded-lg overflow-hidden ${!n.isRead ? 'border-primary/50' : 'border-border'}`}>
                                    <AccordionTrigger className="p-3 hover:no-underline hover:bg-accent/50 data-[state=open]:bg-accent/50">
                                        <div className="flex justify-between items-center w-full">
                                            <h4 className={`font-semibold truncate pr-4 text-left ${!n.isRead ? '' : 'font-normal'}`}>{n.title}</h4>
                                            {!n.isRead && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-background border-t">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    From: {n.createdByDisplayName || 'System Announcement'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ''}
                                                </p>
                                            </div>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                                {n.message}
                                            </p>
                                            <div className="flex justify-end pt-2">
                                                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleDeleteNotification(n.id)}>
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center text-muted-foreground py-10 px-6">
                            <Bell className="mx-auto h-12 w-12" />
                            <p className="mt-4">You have no announcements.</p>
                        </div>
                    )}
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
