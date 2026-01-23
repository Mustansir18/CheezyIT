
'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AnnouncementBell() {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = 0;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white">
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
                        Firebase is detached. No announcements available.
                    </SheetDescription>
                </SheetHeader>
                 <div className="text-center text-muted-foreground py-10 px-6">
                    <Bell className="mx-auto h-12 w-12" />
                    <p className="mt-4">You have no announcements.</p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
