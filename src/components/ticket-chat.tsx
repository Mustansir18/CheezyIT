'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, type WithId } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Send, Copy, CheckCheck, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface TicketChatProps {
    ticket: WithId<Ticket>;
    canManageTicket: boolean;
    isOwner: boolean;
    backLink: string;
    onStatusChange: (newStatus: TicketStatus) => void;
    onDeleteClick: () => void;
}

type UserProfile = {
    displayName: string;
    phoneNumber?: string;
}

export default function TicketChat({ ticket, canManageTicket, isOwner, backLink, onStatusChange, onDeleteClick }: TicketChatProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [message, setMessage] = useState('');

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    
    const { id: ticketId, userId } = ticket;

    const ticketRef = useMemoFirebase(
        () => (userId && ticketId ? doc(firestore, 'users', userId, 'issues', ticketId) : null),
        [firestore, userId, ticketId]
    );

    const userProfileRef = useMemoFirebase(
        () => (userId ? doc(firestore, 'users', userId) : null),
        [firestore, userId]
    );
    const { data: ticketOwnerProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const messagesQuery = useMemoFirebase(
        () => query(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), orderBy('createdAt', 'asc')),
        [firestore, userId, ticketId]
    );
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

    useLayoutEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (!ticketRef) return;
        if (isOwner) {
            updateDoc(ticketRef, { unreadByUser: false });
        } else if (canManageTicket) {
            updateDoc(ticketRef, { unreadByAdmin: false });
        }
    }, [ticketRef, isOwner, canManageTicket]);

    useEffect(() => {
        if (!firestore || !user || !messages || messages.length === 0) return;

        const unreadMessagesFromOthers = messages.filter(
            msg => !msg.isRead && msg.userId !== user.uid
        );

        if (unreadMessagesFromOthers.length > 0) {
            unreadMessagesFromOthers.forEach(msg => {
                if (msg.id) {
                    const msgRef = doc(firestore, 'users', userId, 'issues', ticketId, 'messages', msg.id);
                    updateDoc(msgRef, { isRead: true }).catch(error => {
                        console.error("Failed to mark message as read:", error);
                    });
                }
            });
        }
    }, [messages, firestore, user, userId, ticketId]);

    const messagesWithDateSeparators = useMemo(() => {
        const items: (WithId<ChatMessage> | { type: 'date-separator'; date: string; id: string })[] = [];
        let lastDate: string | null = null;

        messages?.forEach(msg => {
            if (msg.createdAt) {
                const messageDate = format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'PPP');
                if (messageDate !== lastDate) {
                    items.push({ type: 'date-separator', date: messageDate, id: `date-${messageDate}` });
                    lastDate = messageDate;
                }
            }
            items.push(msg);
        });
        return items;
    }, [messages]);


    const handleCopy = (text: string | undefined) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast({
                title: 'Copied!',
                description: 'Phone number copied to clipboard.',
            });
        }).catch(err => {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not copy text.',
            });
        });
    };

    const handleSendMessage = () => {
        if (!message.trim() || !user) return;

        const messageToSend = message;
        setMessage('');

        const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
        const messageData = {
            userId: user.uid,
            displayName: user.displayName || 'User',
            text: messageToSend,
            type: 'user' as const,
            createdAt: serverTimestamp(),
            isRead: false,
        };

        addDoc(messagesCollection, messageData)
          .then(() => {
              if (ticketRef) {
                  const updateData = isOwner ? { unreadByAdmin: true, updatedAt: serverTimestamp() } : { unreadByUser: true, updatedAt: serverTimestamp() };
                  updateDoc(ticketRef, updateData);
              }
          })
          .catch((serverError) => {
            console.error("Error sending message:", serverError);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send message.',
            });
            setMessage(messageToSend);

            const contextualError = new FirestorePermissionError({
                path: messagesCollection.path,
                operation: 'create',
                requestResourceData: messageData
            });
            errorEmitter.emit('permission-error', contextualError);
        });
    };

    return (
        <Card className='flex flex-1 flex-col min-h-0 h-full w-full rounded-none border-0'>
            <header className="flex items-center justify-between gap-3 border-b bg-card p-3">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="flex-shrink-0">
                        <Link href={backLink}>
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                    <div className='flex items-center gap-3'>
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>
                                {ticketOwnerProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-base font-semibold leading-none truncate">
                                {profileLoading ? 'Loading...' : ticketOwnerProfile?.displayName || 'Unknown User'}
                            </p>
                            <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                <span>{ticket.title}</span>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="ml-auto flex items-center gap-2">
                    {canManageTicket ? (
                        <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                            <SelectTrigger className="w-auto text-xs px-3 h-8">
                                <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="outline" className="text-xs h-7">
                            {ticket.status}
                        </Badge>
                    )}
                    {(isOwner || canManageTicket) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onDeleteClick} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Ticket</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>
            <CardContent 
                ref={messagesContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-2"
            >
                {isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                {!isLoading && messagesWithDateSeparators.length === 0 && (
                    <div className="flex justify-center items-center h-full">
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                )}
                {messagesWithDateSeparators.map((item) => {
                    if (item.type === 'date-separator') {
                         return (
                            <div key={item.id} className="flex justify-center my-4">
                                <span className="text-xs text-foreground/80 bg-muted px-3 py-1.5 rounded-full shadow-sm">{item.date}</span>
                            </div>
                        );
                    }
                    const msg = item as WithId<ChatMessage>;
                    const isSender = msg.userId === user?.uid;

                    return (
                        <div key={msg.id} className={cn("flex w-full", isSender ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "relative flex w-fit max-w-[75%] flex-col rounded-lg px-2 pt-1.5 pb-1 text-sm shadow",
                                isSender ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
                            )}>
                                {!isSender && <p className="font-semibold text-xs mb-1 text-accent">{msg.displayName}</p>}
                                
                                <p className="whitespace-pre-wrap break-words pr-[60px] pb-1">
                                    {msg.text}
                                </p>

                                <div className={cn(
                                    "absolute bottom-1 right-2 flex items-center justify-end gap-1 text-[11px]", 
                                    isSender ? "text-primary-foreground/70" : "text-card-foreground/70"
                                )}>
                                    <span>
                                        {msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                    {isSender && (
                                        <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-sky-400" : "currentColor")} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </CardContent>

             <div className="border-t bg-card p-3">
                <div className="relative">
                    <Textarea
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        className="min-h-[48px] w-full resize-none rounded-2xl border-none bg-input py-3 pl-4 pr-16"
                    />
                    <Button 
                        type="submit" 
                        size="icon" 
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full" 
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                    >
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
