
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

export default function AnnouncementHistory() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sent Announcements</CardTitle>
                <CardDescription>A log of all announcements that have been sent.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No announcements have been sent yet. Firebase is detached.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
