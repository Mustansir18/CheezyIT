
'use client';

import type { Announcement } from '@/lib/data';

export default function ReadStatusList({ announcement }: { announcement: Announcement }) {
    return (
        <div className="p-4 text-sm text-muted-foreground">
            Read by {announcement.readBy.length} user(s).
        </div>
    );
}
