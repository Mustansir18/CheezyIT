
'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter, useDoc, type WithId } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Send, ArrowLeft, MoreVertical, Trash2, CheckCheck, Paperclip, Smile } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
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

// WhatsApp specific dark mode colors
const WA_COLORS = {
    bg: '#0b141a',
    header: '#202c33',
    outgoing: '#005c4b',
    incoming: '#202c33',
    text: '#e9edef',
    muted: '#8696a0',
    blue: '#53bdeb'
};

export default function TicketChat({ ticket, canManageTicket, isOwner, backLink, onStatusChange, onDeleteClick }: TicketChatProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    
    const { id: ticketId, userId } = ticket;

    // ... (Keep existing Firebase hooks/logic same as your original file)
    const ticketRef = useMemoFirebase(() => (userId && ticketId ? doc(firestore, 'users', userId, 'issues', ticketId) : null), [firestore, userId, ticketId]);
    const userProfileRef = useMemoFirebase(() => (userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
    const { data: ticketOwnerProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);
    const messagesQuery = useMemoFirebase(() => query(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), orderBy('createdAt', 'asc')), [firestore, userId, ticketId]);
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

    useLayoutEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle marking as read
    useEffect(() => {
        if (!ticketRef) return;
        if (isOwner) updateDoc(ticketRef, { unreadByUser: false });
        else if (canManageTicket) updateDoc(ticketRef, { unreadByAdmin: false });
    }, [ticketRef, isOwner, canManageTicket]);

    const messagesWithDateSeparators = useMemo(() => {
        const items: (WithId<ChatMessage> | { type: 'date-separator'; date: string; id: string })[] = [];
        let lastDate: string | null = null;

        messages?.forEach(msg => {
            if (msg.createdAt) {
                const messageDate = format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'MMMM d, yyyy');
                if (messageDate !== lastDate) {
                    items.push({ type: 'date-separator', date: messageDate, id: `date-${messageDate}` });
                    lastDate = messageDate;
                }
            }
            items.push(msg);
        });
        return items;
    }, [messages]);

    const handleSendMessage = () => {
        if (!message.trim() || !user) return;
        const messageToSend = message;
        setMessage('');

        const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
        addDoc(messagesCollection, {
            userId: user.uid,
            displayName: user.displayName || 'User',
            text: messageToSend,
            type: 'user',
            createdAt: serverTimestamp(),
            isRead: false,
        }).then(() => {
            if (ticketRef) {
                updateDoc(ticketRef, { 
                    unreadByAdmin: isOwner, 
                    unreadByUser: !isOwner, 
                    updatedAt: serverTimestamp() 
                });
            }
        });
    };

    return (
        <Card className="flex flex-1 flex-col h-full w-full rounded-none border-0 overflow-hidden" style={{ backgroundColor: WA_COLORS.bg }}>
            {/* Header: WhatsApp Dark Style */}
            <header className="flex items-center justify-between gap-2 px-4 py-2 shadow-md z-10" style={{ backgroundColor: WA_COLORS.header }}>
                <div className="flex items-center gap-2">
                    <Link href={backLink} className="text-[#aebac1] hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#6a7175] text-white">
                            {ticketOwnerProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-white font-medium leading-tight">
                            {profileLoading ? '...' : ticketOwnerProfile?.displayName || 'User'}
                        </span>
                        <span className="text-[12px] text-[#8696a0] truncate max-w-[150px]">
                            {ticket.title}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {canManageTicket ? (
                        <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                            <SelectTrigger className="h-8 bg-transparent border-[#424d54] text-white text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#233138] border-[#424d54] text-white">
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge className="bg-[#202c33] text-[#8696a0] border-[#424d54]">{ticket.status}</Badge>
                    )}
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[#aebac1]">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#233138] border-[#424d54] text-white">
                            <DropdownMenuItem onClick={onDeleteClick} className="text-red-400">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Ticket
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Chat Body with Doodle */}
            <CardContent 
                ref={messagesContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-1 relative"
                style={{ 
                    backgroundImage: `url('/bg.png')`,
                    backgroundBlendMode: 'overlay',
                    backgroundColor: 'rgba(11, 20, 26, 0.95)'
                }}
            >
                {messagesWithDateSeparators.map((item, idx) => {
                    if (item.type === 'date-separator') {
                        return (
                            <div key={item.id} className="flex justify-center my-4 sticky top-2 z-10">
                                <span className="text-[12px] uppercase bg-[#182229] text-[#8696a0] px-3 py-1 rounded-md shadow-sm">
                                    {item.date}
                                </span>
                            </div>
                        );
                    }

                    const msg = item as WithId<ChatMessage>;
                    const isSender = msg.userId === user?.uid;
                    
                    // Logic to show "tail" only on the first message of a block
                    const prevMsg = messagesWithDateSeparators[idx - 1] as WithId<ChatMessage>;
                    const isFirstInBlock = !prevMsg || prevMsg.userId !== msg.userId || (prevMsg as any).type === 'date-separator';

                    return (
                        <div key={msg.id} className={cn("flex w-full mb-1", isSender ? "justify-end" : "justify-start")}>
                            <div 
                                className={cn(
                                    "relative max-w-[85%] px-2 pt-1 pb-1.5 shadow-sm text-[14.2px] leading-relaxed",
                                    isSender ? "bg-[#005c4b] text-[#e9edef]" : "bg-[#202c33] text-[#e9edef]",
                                    isFirstInBlock ? (isSender ? "rounded-l-lg rounded-br-lg" : "rounded-r-lg rounded-bl-lg") : "rounded-lg"
                                )}
                            >
                                {/* The "Tail" Triangle */}
                                {isFirstInBlock && (
                                    <div className={cn(
                                        "absolute top-0 w-2 h-3",
                                        isSender ? "-right-2 bg-[#005c4b]" : "-left-2 bg-[#202c33]"
                                    )} style={{ clipPath: isSender ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }} />
                                )}

                                {!isSender && canManageTicket && (
                                    <p className="font-bold text-[12.5px] mb-0.5 text-[#53bdeb] block">
                                        {msg.displayName}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-end gap-x-4">
                                    <p className="whitespace-pre-wrap break-words flex-1 min-w-0 py-0.5">
                                        {msg.text}
                                    </p>
                                    
                                    <div className="flex items-center gap-1 ml-auto pt-1 h-4">
                                        <span className="text-[11px] text-[#8696a0] uppercase">
                                            {msg.createdAt ? format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'p') : ''}
                                        </span>
                                        {isSender && (
                                            <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-[#53bdeb]" : "text-[#8696a0]")} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>

            {/* Input Bar: WhatsApp Style */}
            <footer className="p-2 bg-[#202c33] flex items-end gap-2">
                <div className="flex items-center gap-1 text-[#8696a0]">
                   <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0"><Smile /></Button>
                   <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0"><Paperclip /></Button>
                </div>
                
                <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-1 min-h-[40px] flex items-center">
                    <Textarea
                        placeholder="Type a message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        className="bg-transparent border-none focus-visible:ring-0 text-white min-h-[24px] max-h-[120px] resize-none p-0 py-1 text-[15px] placeholder:text-[#8696a0]"
                    />
                </div>

                <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="h-12 w-12 rounded-full bg-[#00a884] hover:bg-[#06cf9c] shrink-0 p-0"
                >
                    <Send className="h-6 w-6 text-[#111b21]" fill="currentColor" />
                </Button>
            </footer>
        </Card>
    );
}
