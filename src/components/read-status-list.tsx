
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';

type Announcement = {
    id: string;
    recipientUids: string[];
    readBy: string[];
};


export default function ReadStatusList({ announcement }: { announcement: Announcement }) {
    return (
        <ScrollArea className="h-64 rounded-md border">
            <div className="p-4 text-center text-muted-foreground">
                Read status is not available because Firebase is detached.
            </div>
        </ScrollArea>
    );
}
