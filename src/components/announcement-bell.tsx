'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, Trash2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSound } from '@/hooks/use-sound';

import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/lib/data';
import type { User } from '@/components/user-management';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function AnnouncementBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const playSound = useSound('/sounds/new-announcement.mp3');
    const unreadCountRef = useRef(0);
    const isInitialMount = useRef(true);
    
    const loadData = useCallback(() => {
        const userJson = localStorage.getItem('mockUser');
        if (userJson) setCurrentUser(JSON.parse(userJson));

        const announcementsJson = localStorage.getItem('mockAnnouncements');
        if (announcementsJson) {
            const parsed = JSON.parse(announcementsJson).map((a: any) => ({
                ...a,
                createdAt: new Date(a.createdAt),
                startDate: a.startDate ? new Date(a.startDate) : undefined,
                endDate: a.endDate ? new Date(a.endDate) : undefined,
                readBy: a.readBy || [],
            }));
            setAllAnnouncements(parsed);
        }
    }, []);

    useEffect(() => {
        loadData();

        const handleStorageChange = (e: StorageEvent | CustomEvent) => {
            if (e instanceof StorageEvent) {
                if (['mockAnnouncements', 'mockUser'].includes(e.key || '')) {
                    loadData();
                }
            } else {
                loadData();
            }
        };
        
        window.addEventListener('storage', handleStorageChange as EventListener);
        window.addEventListener('local-storage-change', handleStorageChange as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange as EventListener);
            window.removeEventListener('local-storage-change', handleStorageChange as EventListener);
        };
    }, [loadData]);
    
    const isPrivilegedUser = useMemo(() => {
        if (!currentUser) return false;
        return ['Admin', 'Head'].includes(currentUser.role);
    }, [currentUser]);

    const relevantAnnouncements = useMemo(() => {
        if (!currentUser) return [];
        const now = new Date();

        return allAnnouncements
            .filter(ann => {
                // Check if announcement is within the active date range
                const isWithinDate = 
                    (!ann.startDate || ann.startDate <= now) &&
                    (!ann.endDate || ann.endDate >= now);

                if (!isWithinDate) return false;
                
                // If no targets are set, it's a broadcast to everyone
                const isBroadcast = ann.targetRoles.length === 0 && ann.targetUsers.length === 0;
                if (isBroadcast) return true;
                
                // If targets are set, check if the user matches ANY of them (OR logic)
                if (currentUser.id && ann.targetUsers.includes(currentUser.id)) return true;

                // Check for role match
                if (ann.targetRoles.includes(currentUser.role)) return true;

                return false;
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [allAnnouncements, currentUser]);
    
    const unreadCount = useMemo(() => {
        if (!currentUser) return 0;
        return relevantAnnouncements.filter(ann => !ann.readBy.includes(currentUser.id)).length;
    }, [relevantAnnouncements, currentUser]);

    useEffect(() => {
        if (isInitialMount.current) {
            unreadCountRef.current = unreadCount;
            isInitialMount.current = false;
            return;
        }

        if (unreadCount > unreadCountRef.current) {
            playSound();
        }
        unreadCountRef.current = unreadCount;
    }, [unreadCount, playSound]);

    const handleMarkAsRead = useCallback((announcementId: string) => {
        if (!currentUser) return;

        const announcement = allAnnouncements.find(a => a.id === announcementId);
        if (announcement && announcement.readBy.includes(currentUser.id)) return;

        const updatedAnnouncements = allAnnouncements.map(ann => {
            if (ann.id === announcementId && !ann.readBy.includes(currentUser.id)) {
                return { ...ann, readBy: [...ann.readBy, currentUser.id] };
            }
            return ann;
        });
        localStorage.setItem('mockAnnouncements', JSON.stringify(updatedAnnouncements));
        window.dispatchEvent(new Event('local-storage-change'));
    }, [allAnnouncements, currentUser]);

     const handleMarkAllAsRead = useCallback(() => {
        if (!currentUser || unreadCount === 0) return;

        const relevantIds = relevantAnnouncements.map(a => a.id);
        const updatedAnnouncements = allAnnouncements.map(ann => {
            if (relevantIds.includes(ann.id) && !ann.readBy.includes(currentUser.id)) {
                 return { ...ann, readBy: [...ann.readBy, currentUser.id] };
            }
            return ann;
        });
        localStorage.setItem('mockAnnouncements', JSON.stringify(updatedAnnouncements));
        window.dispatchEvent(new Event('local-storage-change'));
    }, [allAnnouncements, currentUser, relevantAnnouncements, unreadCount]);

    const handleDelete = (announcementId: string) => {
        const updatedAnnouncements = allAnnouncements.filter(a => a.id !== announcementId);
        localStorage.setItem('mockAnnouncements', JSON.stringify(updatedAnnouncements));
        window.dispatchEvent(new Event('local-storage-change'));
        setDeletingId(null);
    };

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
                                    const isUnread = currentUser && !ann.readBy.includes(currentUser.id);
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
                                                    {formatDistanceToNow(ann.createdAt, { addSuffix: true })}
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
