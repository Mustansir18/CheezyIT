'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, type WithId } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Send, Copy, CheckCheck, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';


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
            <CardHeader className="flex-shrink-0 bg-zinc-800 text-white px-2 py-1">
                <div className="flex items-center gap-2">
                     <Button asChild variant="destructive" size="icon" className="h-7 w-7 flex-shrink-0">
                        <Link href={backLink}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                    <div className="flex-1 overflow-hidden">
                        <CardTitle className="truncate text-sm font-semibold">{ticket.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 truncate text-gray-400 text-xs">
                            {profileLoading ? (
                                'Loading...'
                            ) : ticketOwnerProfile ? (
                                <>
                                    <span className="truncate">{ticketOwnerProfile.displayName}</span>
                                    {ticketOwnerProfile.phoneNumber && (
                                        <div className="hidden sm:flex items-center gap-1">
                                            <span>- {ticketOwnerProfile.phoneNumber}</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 text-gray-400 hover:bg-zinc-700 hover:text-white"
                                                            onClick={() => handleCopy(ticketOwnerProfile.phoneNumber)}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                            <span className="sr-only">Copy phone number</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Copy to clipboard</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    )}
                                </>
                            ) : null }
                        </CardDescription>
                    </div>
                     <div className="ml-auto flex items-center gap-2">
                        {canManageTicket ? (
                            <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                                <SelectTrigger className="w-auto text-xs px-2 h-7 bg-green-600 text-white border-transparent hover:bg-green-700 focus:ring-0">
                                    <SelectValue placeholder="Change status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant="default" className="text-xs h-6 bg-green-600 text-white border-transparent hover:bg-green-700">
                                {ticket.status}
                            </Badge>
                        )}
                        {isOwner && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 hover:bg-zinc-700">
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
                </div>
            </CardHeader>
            <Separator />
            <CardContent ref={messagesContainerRef} className="overflow-y-auto p-2 sm:p-4 bg-muted/50 flex-grow">
                    {isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {!isLoading && messages && messages.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages?.map((msg) => {
                        const isSender = msg.userId === user?.uid;
                        return (
                             <div key={msg.id} className={cn(
                                "flex w-full my-1",
                                isSender ? "justify-end" : "justify-start"
                            )}>
                                <div className={cn(
                                    "relative max-w-[75%] rounded-lg px-3 py-2",
                                    isSender ? "bg-green-800 text-white" : "bg-zinc-700 text-white"
                                )}>
                                    <p className="whitespace-pre-wrap break-words pr-20 text-sm leading-relaxed">
                                        {msg.text}
                                    </p>
                                    <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-gray-400">
                                        {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isSender && (
                                            <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-sky-400" : "text-gray-500")} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
            </CardContent>

             <div className="border-t p-2 sm:p-3 bg-background">
                 <div className="relative">
                    <Textarea
                        placeholder={"Type a message..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        className="min-h-12 resize-none rounded-lg p-3 pr-20 shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                     <div className="absolute right-2 sm:right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:gap-2">
                       <Button type="submit" size="sm" onClick={handleSendMessage} disabled={!message.trim()}>
                            <span className="hidden sm:inline-block">Send</span>
                            <Send className="h-4 w-4 sm:ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
