
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Announcement } from '@/lib/data';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ReadStatusList from './read-status-list';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


function RecipientSummary({ announcement }: { announcement: Announcement }) {
    const parts = [];
    if (announcement.targetRoles?.length > 0) parts.push(`Roles: ${announcement.targetRoles.join(', ')}`);
    if (announcement.targetRegions?.length > 0) parts.push(`Regions: ${announcement.targetRegions.join(', ')}`);
    if (announcement.targetUsers?.length > 0) parts.push(`${announcement.targetUsers.length} specific user(s)`);
    
    if (parts.length === 0) {
        return <Badge variant="secondary">All Users</Badge>;
    }
    return <span className="text-xs text-muted-foreground">{parts.join('; ')}</span>;
}

export default function AnnouncementHistory({ 
    announcements,
    onDelete,
    canDelete 
}: { 
    announcements: Announcement[],
    onDelete: (announcement: Announcement) => void,
    canDelete: boolean,
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sent Announcements</CardTitle>
                <CardDescription>A log of all announcements that have been sent.</CardDescription>
            </CardHeader>
            <CardContent>
                {announcements && announcements.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {announcements.map(announcement => (
                             <AccordionItem value={announcement.id} key={announcement.id}>
                                <div className="flex items-center w-full group">
                                    <AccordionTrigger className="flex-1">
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-semibold">{announcement.title}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    Sent on {format(new Date(announcement.createdAt as any), "MMM d, yyyy 'at' h:mm a")}
                                                </span>
                                            </div>
                                            <RecipientSummary announcement={announcement} />
                                        </div>
                                    </AccordionTrigger>
                                    {canDelete && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 mr-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the announcement "{announcement.title}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onDelete(announcement)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                                <AccordionContent className="space-y-3 px-1 pt-2">
                                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/50 p-4">
                                       <p className="mt-0">{announcement.message}</p>
                                    </div>
                                    <ReadStatusList announcement={announcement} />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                        No announcements have been sent yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
