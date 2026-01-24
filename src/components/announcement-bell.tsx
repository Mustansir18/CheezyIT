
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/lib/data';
import type { User } from '@/components/user-management';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AnnouncementBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
    
    // Using a state to force re-render when local storage changes
    const [lastUpdated, setLastUpdated] = useState(Date.now()); 
    
    useEffect(() => {
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

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mockAnnouncements' || e.key === 'mockUser') {
                 setLastUpdated(Date.now());
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);

    }, [lastUpdated]); // Rerun on storage event
    

    const relevantAnnouncements = useMemo(() => {
        if (!currentUser) return [];
        const now = new Date();
        return allAnnouncements.filter(ann => {
            const isTargeted = 
                (ann.targetRoles.length === 0 && ann.targetRegions.length === 0 && ann.targetUsers.length === 0) ||
                (ann.targetRoles.includes(currentUser.role)) ||
                (currentUser.region && ann.targetRegions.includes(currentUser.region)) ||
                (currentUser.regions && currentUser.regions.some(r => ann.targetRegions.includes(r))) ||
                (currentUser.id && ann.targetUsers.includes(currentUser.id));
            
            const isWithinDate = 
                (!ann.startDate || ann.startDate <= now) &&
                (!ann.endDate || ann.endDate >= now);

            return isTargeted && isWithinDate;
        });
    }, [allAnnouncements, currentUser]);
    
    const unreadCount = useMemo(() => {
        if (!currentUser) return 0;
        return relevantAnnouncements.filter(ann => !ann.readBy.includes(currentUser.id)).length;
    }, [relevantAnnouncements, currentUser]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && unreadCount > 0 && currentUser) {
            // Mark all as read
            const updatedAnnouncements = allAnnouncements.map(ann => {
                const isRelevant = relevantAnnouncements.some(ra => ra.id === ann.id);
                if (isRelevant && !ann.readBy.includes(currentUser.id)) {
                    return { ...ann, readBy: [...ann.readBy, currentUser.id] };
                }
                return ann;
            });
            setAllAnnouncements(updatedAnnouncements);
            localStorage.setItem('mockAnnouncements', JSON.stringify(updatedAnnouncements));
        }
    };
    

    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
                    <SheetTitle>Announcements</SheetTitle>
                    <SheetDescription>
                        Here are the latest updates and announcements.
                    </SheetDescription>
                </SheetHeader>
                {relevantAnnouncements.length > 0 ? (
                    <ScrollArea className="flex-1 -mx-6">
                        <div className="px-6 space-y-4 pt-4">
                            {relevantAnnouncements.map(ann => (
                                <div key={ann.id} className="border-l-4 border-primary pl-4 py-2">
                                    <p className="font-semibold">{ann.title}</p>
                                    <p className="text-sm text-muted-foreground">{ann.message}</p>
                                    <p className="text-xs text-muted-foreground/80 mt-2">
                                        {formatDistanceToNow(ann.createdAt, { addSuffix: true })}
                                    </p>
                                </div>
                            ))}
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
    );
}
