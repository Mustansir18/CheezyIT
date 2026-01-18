
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, type WithId } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import ReadStatusList from './read-status-list';

type Announcement = {
    id: string;
    title: string;
    message: string;
    createdAt: any;
    startDate?: any;
    endDate?: any;
    createdByDisplayName: string;
    recipientCount: number;
    recipientUids: string[];
    readBy: string[];
    target: {
        roles: string[];
        regions: string[];
        users: string[];
    };
};

function AnnouncementDetailsDialog({ announcement }: { announcement: Announcement }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{announcement.title}</DialogTitle>
                     <DialogDescription>
                        Details about the announcement and its read status.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div>
                        <h4 className="font-semibold mb-2">Details</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Sent:</strong> {format(announcement.createdAt.toDate(), 'PPP p')} by {announcement.createdByDisplayName}</p>
                            <p>
                                <strong>Active Period:</strong> 
                                {announcement.startDate ? format(announcement.startDate.toDate(), 'PP') : 'Always'}
                                {' to '}
                                {announcement.endDate ? format(announcement.endDate.toDate(), 'PP') : 'Never'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Message</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.message}</p>
                    </div>
                    <div>
                         <h4 className="font-semibold mb-2">Read Status ({announcement.recipientCount} recipients)</h4>
                         <ReadStatusList announcement={announcement} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


export default function AnnouncementHistory() {
    const firestore = useFirestore();

    const announcementsQuery = useMemoFirebase(
        () => query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc')),
        [firestore]
    );
    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sent Announcements</CardTitle>
                <CardDescription>A log of all announcements that have been sent.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Sent Date</TableHead>
                            <TableHead>Active Period</TableHead>
                            <TableHead>Sent By</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : announcements && announcements.length > 0 ? (
                            announcements.map(announcement => (
                                <TableRow key={announcement.id}>
                                    <TableCell className="font-medium">{announcement.title}</TableCell>
                                    <TableCell>{announcement.createdAt ? format(announcement.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        {announcement.startDate ? format(announcement.startDate.toDate(), 'PP') : 'From start'}
                                        {' to '}
                                        {announcement.endDate ? format(announcement.endDate.toDate(), 'PP') : 'No Expiry'}
                                    </TableCell>
                                    <TableCell>{announcement.createdByDisplayName}</TableCell>
                                    <TableCell>{announcement.recipientCount}</TableCell>
                                    <TableCell className="text-right">
                                        <AnnouncementDetailsDialog announcement={announcement} />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No announcements have been sent yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
