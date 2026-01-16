'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, type WithId } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Send, ArrowLeft, MoreVertical, Trash2, CheckCheck, Paperclip, Smile } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
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

const WA_COLORS = {
    bg: '#0b141a',
    header: '#202c33',
    outgoing: '#005c4b',
    incoming: '#202c33',
    text: '#e9edef',
    muted: '#8696a0',
    blue: '#53bdeb',
    dateBg: '#182229'
};

export default function TicketChat({ ticket, canManageTicket, isOwner, backLink, onStatusChange, onDeleteClick }: TicketChatProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [message, setMessage] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    
    const { id: ticketId, userId } = ticket;

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

    useEffect(() => {
        if (!ticketRef) return;
        const updateData: { unreadByUser?: boolean; unreadByAdmin?: boolean } = {};
        if (isOwner && ticket.unreadByUser) {
            updateData.unreadByUser = false;
        } else if (canManageTicket && ticket.unreadByAdmin) {
            updateData.unreadByAdmin = false;
        }
        if (Object.keys(updateData).length > 0) {
            updateDoc(ticketRef, updateData);
        }
    }, [ticketRef, isOwner, canManageTicket, ticket.unreadByUser, ticket.unreadByAdmin]);

    const messagesWithDateSeparators = useMemo(() => {
        const items: (WithId<ChatMessage> | { type: 'date-separator'; date: string; id: string })[] = [];
        let lastDate: string | null = null;

        messages?.forEach(msg => {
            if (msg.createdAt) {
                const messageDate = format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'dd/MM/yyyy');
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
        const msgText = message;
        setMessage('');

        const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
        addDoc(messagesCollection, {
            userId: user.uid,
            displayName: user.displayName || 'User',
            text: msgText,
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
            {/* Header */}
            <header className="flex items-center justify-between gap-2 px-4 py-2 z-20 shadow-sm" style={{ backgroundColor: WA_COLORS.header }}>
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
                        <span className="text-white font-medium leading-tight text-[15px]">{profileLoading ? '...' : ticketOwnerProfile?.displayName}</span>
                        <span className="text-[12px] text-[#8696a0] line-clamp-1">{ticket.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {canManageTicket && (
                        <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                            <SelectTrigger className="h-8 bg-transparent border-none text-white text-xs hover:bg-white/5 focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#233138] border-[#424d54] text-white">
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10"><MoreVertical className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#233138] border-[#424d54] text-white">
                            <DropdownMenuItem onClick={onDeleteClick} className="text-red-400"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Chat Body */}
            <CardContent 
                ref={messagesContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-[2px]" 
                style={{ 
                    backgroundImage: `url('/bg.png')`,
                    backgroundBlendMode: 'overlay',
                    backgroundColor: 'rgba(11, 20, 26, 0.99)'
                }}
            >
                {messagesWithDateSeparators.map((item, idx) => {
                    if (item.type === 'date-separator') {
                        return (
                            <div key={item.id} className="flex justify-center my-4 sticky top-0 z-10">
                                <span className="text-[12.5px] bg-[#182229] text-[#8696a0] px-3 py-1.5 rounded-[7px] shadow-sm">
                                    {item.date}
                                </span>
                            </div>
                        );
                    }

                    const msg = item as WithId<ChatMessage>;
                    const isSender = msg.userId === user?.uid;
                    const prevItem = messagesWithDateSeparators[idx - 1];
                    const isFirstInBlock = !prevItem || (prevItem as any).type === 'date-separator' || (prevItem as any).userId !== msg.userId;

                    return (
                        <div key={msg.id} className={cn("flex w-full relative", isSender ? "justify-end" : "justify-start", isFirstInBlock ? "mt-2" : "mt-0")}>
                            {/* SVG Tail Component */}
                            {isFirstInBlock && (
                                <div className={cn(
                                    "absolute top-0 z-[1]",
                                    isSender ? "-right-2" : "-left-2"
                                )}>
                                    <svg width="8" height="13" viewBox="0 0 8 13">
                                        <path 
                                            d={isSender ? "M0,0 C3,0 8,0 8,0 L8,13 Z" : "M8,0 C5,0 0,0 0,0 L0,13 Z"} 
                                            fill={isSender ? WA_COLORS.outgoing : WA_COLORS.incoming} 
                                        />
                                    </svg>
                                </div>
                            )}

                            <div 
                                className={cn(
                                    "relative max-w-[85%] px-2 pt-1.5 pb-1 shadow-sm text-[14.2px] min-w-[65px] z-[2]",
                                    isSender ? "bg-[#005c4b]" : "bg-[#202c33]",
                                    "text-[#e9edef]",
                                    // WhatsApp specific rounding
                                    isSender 
                                        ? (isFirstInBlock ? "rounded-l-[7.5px] rounded-br-[7.5px] rounded-tr-none" : "rounded-[7.5px]")
                                        : (isFirstInBlock ? "rounded-r-[7.5px] rounded-bl-[7.5px] rounded-tl-none" : "rounded-[7.5px]")
                                )}
                            >
                                <div className="flex flex-col">
                                    {!isSender && isFirstInBlock && canManageTicket && (
                                        <span className="font-bold text-[12.5px] text-[#53bdeb] mb-0.5">{msg.displayName}</span>
                                    )}
                                    <div className="flex flex-wrap items-end justify-between gap-x-3">
                                        <p className="whitespace-pre-wrap break-words leading-[19px] flex-1 pb-1">
                                            {msg.text}
                                        </p>
                                        <div className="flex items-center gap-1 self-end mb-[2px] ml-auto select-none">
                                            <span className="text-[11px] text-[#8696a0] uppercase">
                                                {msg.createdAt ? format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'h:mm a') : ''}
                                            </span>
                                            {isSender && (
                                                <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-[#53bdeb]" : "text-[#8696a0]")} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>

            {/* Footer Input */}
            <footer className="p-2 bg-[#202c33] flex items-center gap-2">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="text-[#8696a0] rounded-full"><Smile className="h-6 w-6" /></Button>
                    <Button variant="ghost" size="icon" className="text-[#8696a0] rounded-full"><Paperclip className="h-5 w-5" /></Button>
                </div>
                <div className="flex-1 bg-[#2a3942] rounded-[8px] px-3 py-1 flex items-center min-h-[42px]">
                    <Textarea
                        placeholder="Type a message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        className="bg-transparent border-none focus-visible:ring-0 text-[#e9edef] min-h-[20px] max-h-[120px] resize-none p-0 text-[15px] placeholder:text-[#8696a0]"
                    />
                </div>
                <Button 
                    onClick={handleSendMessage} 
                    disabled={!message.trim()} 
                    className="h-11 w-11 rounded-full bg-[#00a884] hover:bg-[#06cf9c] shrink-0 p-0 flex items-center justify-center transition-all active:scale-95"
                >
                    <Send className="h-5 w-5 text-[#111b21] ml-0.5" fill="currentColor" />
                </Button>
            </footer>
        </Card>
    );
}
