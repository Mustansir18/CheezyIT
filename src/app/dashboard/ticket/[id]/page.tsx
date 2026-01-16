'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TicketChat from '@/components/ticket-chat';
import type { Ticket } from '@/lib/data';
import Link from 'next/link';
import { useMemo } from 'react';
import { isAdmin } from '@/lib/admins';

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const ticketId = params.id as string;
    const ownerId = searchParams.get('ownerId');

    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const effectiveUserId = useMemo(() => {
        if (ownerId && user && isAdmin(user.email)) {
            return ownerId;
        }
        return user?.uid;
    }, [ownerId, user]);


    const ticketRef = useMemoFirebase(
        () => (effectiveUserId && ticketId ? doc(firestore, 'users', effectiveUserId, 'issues', ticketId) : null),
        [firestore, effectiveUserId, ticketId]
    );
    const { data: ticket, isLoading: ticketLoading } = useDoc<Ticket>(ticketRef);

    if (userLoading || ticketLoading || !effectiveUserId) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        router.push('/');
        return null;
    }

    if (!ticket) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-semibold">Ticket not found</h2>
                <p className="text-muted-foreground">This ticket may have been deleted or you may not have permission to view it.</p>
                 <Button asChild variant="outline" className="mt-4">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        )
    }
    
    const backLink = isAdmin(user.email) && ownerId ? '/admin' : '/dashboard';

    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-4">
                 <Button asChild variant="outline" size="icon" className="h-7 w-7">
                    <Link href={backLink}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Ticket Details
                </h1>
                <Badge variant="outline" className="ml-auto sm:ml-0">
                    {ticket.status}
                </Badge>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{ticket.title}</CardTitle>
                    <CardDescription>
                        Priority: <Badge variant={ticket.priority === 'High' ? 'destructive' : 'secondary'}>{ticket.priority}</Badge> | Opened on {ticket.createdAt?.toDate().toLocaleDateString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">{ticket.description}</p>
                    {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <a href={ticket.attachments[0]} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                View Attachment
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>
            <TicketChat ticketId={ticketId} userId={effectiveUserId} />
        </div>
    );
}
