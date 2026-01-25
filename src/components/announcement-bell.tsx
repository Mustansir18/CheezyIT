'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, Trash2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSound } from '@/hooks/use-sound';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/lib/data';
import type { User } from '@/components/user-management';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, updateDoc, arrayUnion, deleteDoc, writeBatch } from 'firebase/firestore';
import { isAdmin } from '@/lib/admins';


export default function AnnouncementBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { user: currentUser, loading: userLoading } = useUser();
    const firestore = useFirestore();
    
    const playSound = useSound('/sounds/new-announcement.mp3');
    const unreadCountRef = useRef(0);
    const isInitialMount = useRef(true);

    const userProfileRef = useMemoFirebase(() => (currentUser ? doc(firestore, 'users', currentUser.uid) : null), [firestore, currentUser]);
    const { data: currentUserProfile, isLoading: profileLoading } = useDoc<User>(userProfileRef);

    const announcementsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'announcements') : null), [firestore]);
    const { data: allAnnouncements, isLoading: announcementsLoading } = useCollection<Announcement>(announcementsQuery);
    
    const isPrivilegedUser = useMemo(() => {
        if (!currentUserProfile) return false;
        if(isAdmin(currentUserProfile.email)) return true;
        return ['Admin', 'Head'].includes(currentUserProfile.role);
    }, [currentUserProfile]);

    const relevantAnnouncements = useMemo(() => {
        if (!currentUserProfile || !allAnnouncements) return [];
        const now = new Date();

        return allAnnouncements
            .filter(ann => {
                const startDate = ann.startDate ? (ann.startDate as any).toDate() : null;
                const endDate = ann.endDate ? (ann.endDate as any).toDate() : null;
                // Check if announcement is within the active date range
                const isWithinDate = 
                    (!startDate || startDate <= now) &&
                    (!endDate || endDate >= now);

                if (!isWithinDate) return false;
                
                // If no targets are set, it's a broadcast to everyone
                const isBroadcast = ann.targetRoles.length === 0 && ann.targetUsers.length === 0;
                if (isBroadcast) return true;
                
                // If targets are set, check if the user matches ANY of them (OR logic)
                if (currentUserProfile.id && ann.targetUsers.includes(currentUserProfile.id)) return true;

                // Check for role match
                if (ann.targetRoles.includes(currentUserProfile.role)) return true;

                return false;
            })
            .sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
    }, [allAnnouncements, currentUserProfile]);
    
    const unreadCount = useMemo(() => {
        if (!currentUserProfile) return 0;
        return relevantAnnouncements.filter(ann => !ann.readBy.includes(currentUserProfile.id)).length;
    }, [relevantAnnouncements, currentUserProfile]);

    useEffect(() => {
        if (isInitialMount.current || userLoading || profileLoading || announcementsLoading) {
            unreadCountRef.current = unreadCount;
            isInitialMount.current = false;
            return;
        }

        if (unreadCount > unreadCountRef.current) {
            playSound();
        }
        unreadCountRef.current = unreadCount;
    }, [unreadCount, playSound, userLoading, profileLoading, announcementsLoading]);

    const handleMarkAsRead = useCallback(async (announcementId: string) => {
        if (!currentUserProfile || !firestore) return;

        const announcement = allAnnouncements?.find(a => a.id === announcementId);
        if (announcement && announcement.readBy.includes(currentUserProfile.id)) return;

        const annRef = doc(firestore, 'announcements', announcementId);
        try {
            await updateDoc(annRef, {
                readBy: arrayUnion(currentUserProfile.id)
            });
        } catch(e) {
            console.error("Failed to mark as read", e);
        }
    }, [allAnnouncements, currentUserProfile, firestore]);

     const handleMarkAllAsRead = useCallback(async () => {
        if (!currentUserProfile || !firestore || unreadCount === 0) return;

        const unreadAnnouncements = relevantAnnouncements.filter(ann => !ann.readBy.includes(currentUserProfile.id));
        if (unreadAnnouncements.length === 0) return;

        const batch = writeBatch(firestore);
        unreadAnnouncements.forEach(ann => {
            const annRef = doc(firestore, 'announcements', ann.id);
            batch.update(annRef, { readBy: arrayUnion(currentUserProfile.id) });
        });

        try {
            await batch.commit();
        } catch (e) {
            console.error("Failed to mark all as read", e);
        }
    }, [firestore, currentUserProfile, relevantAnnouncements, unreadCount]);

    const handleDelete = async (announcementId: string) => {
        if (!firestore) return;
        const annRef = doc(firestore, 'announcements', announcementId);
        try {
            await deleteDoc(annRef);
        } catch(e) {
            console.error("Failed to delete announcement", e);
        }
        setDeletingId(null);
    };

    const loading = userLoading || profileLoading || announcementsLoading;

    if (loading) {
        return <Skeleton className="h-10 w-10 rounded-full" />;
    }

    return (
        <>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white animate-pulse">
                                {unreadCount}
                            </Badge>
                        )}
                        <span className="sr-only">Notifications</span>
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <div className="flex justify-between items-center">
                            <SheetTitle>Announcements</SheetTitle>
                            {unreadCount > 0 && (
                                <Button variant="link" size="sm" onClick={handleMarkAllAsRead} className="h-auto p-0 text-primary">
                                    <CheckCheck className="mr-1 h-4 w-4" />
                                    Mark all as read
                                </Button>
                            )}
                        </div>
                        <SheetDescription>
                            Here are the latest updates and announcements.
                        </SheetDescription>
                    </SheetHeader>
                    {relevantAnnouncements.length > 0 ? (
                        <ScrollArea className="flex-1 -mx-6">
                            <div className="px-6 space-y-2 pt-4">
                                {relevantAnnouncements.map(ann => {
                                    const isUnread = currentUserProfile && !ann.readBy.includes(currentUserProfile.id);
                                    const createdAtDate = ann.createdAt?.toDate ? ann.createdAt.toDate() : new Date(ann.createdAt);
                                    return (
                                        <div key={ann.id} className={cn("group relative rounded-md transition-colors", isUnread && "bg-primary/5")}>
                                            <div
                                                onClick={() => handleMarkAsRead(ann.id)}
                                                className={cn(
                                                    "border-l-4 pl-4 py-3 cursor-pointer",
                                                    isUnread ? "border-primary" : "border-transparent"
                                                )}
                                            >
                                                <p className="font-semibold">{ann.title}</p>
                                                <p className="text-sm text-muted-foreground">{ann.message}</p>
                                                <p className="text-xs text-muted-foreground/80 mt-2">
                                                    {formatDistanceToNow(createdAtDate, { addSuffix: true })}
                                                </p>
                                            </div>
                                            {isPrivilegedUser && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setDeletingId(ann.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-10 px-6">
                            <Bell className="mx-auto h-12 w-12" />
                            <p className="mt-4">You have no new announcements.</p>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this announcement. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(deletingId!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
