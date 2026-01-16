'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, type WithId } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, writeBatch, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, MoreVertical, Trash2, CheckCheck, Smile, Send, Copy } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

const WA_COLORS = {
    bg: '#0b141a',
    header: '#202c33',
    outgoing: '#005c4b',
    incoming: '#202c33',
    dateBg: '#182229',
    blue: '#53bdeb'
};

export default function TicketChat({ ticket, canManageTicket, backLink, onStatusChange, onDeleteClick }: any) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const { id: ticketId, userId } = ticket;

    const userProfileRef = useMemoFirebase(() => (userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
    const { data: ticketOwnerProfile } = useDoc<any>(userProfileRef);
    const messagesQuery = useMemoFirebase(() => query(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), orderBy('createdAt', 'asc')), [firestore, userId, ticketId]);
    const { data: messages } = useCollection<ChatMessage>(messagesQuery);

    // Auto-read logic
    useEffect(() => {
        if (!messages || !user || !ticketId || !userId) return;
        const markAsRead = async () => {
            const unreadQuery = query(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), where('userId', '!=', user.uid), where('isRead', '==', false));
            const querySnapshot = await getDocs(unreadQuery);
            if (querySnapshot.empty) return;
            const batch = writeBatch(firestore);
            querySnapshot.docs.forEach((msgDoc) => batch.update(msgDoc.ref, { isRead: true }));
            await batch.commit();
        };
        markAsRead();
    }, [messages, user, firestore, ticketId, userId]);

    useLayoutEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const messagesWithDateSeparators = useMemo(() => {
        const items: any[] = [];
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
        addDoc(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), {
            userId: user.uid,
            displayName: user.displayName || 'User',
            text: msgText,
            createdAt: serverTimestamp(),
            isRead: false,
        });
    };

    return (
        /* The main container MUST be h-full and overflow-hidden to keep header/footer static */
        <div className="flex flex-col h-full w-full overflow-hidden" style={{ backgroundColor: WA_COLORS.bg }}>
            
            {/* 1. FIXED HEADER - Stays at the top */}
            <header className="flex-none w-full flex items-center justify-between gap-2 px-4 py-2 z-[100] border-b border-white/5" style={{ backgroundColor: WA_COLORS.header }}>
                <div className="flex items-center gap-3">
                    <Link href={backLink} className="text-[#aebac1] hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#6a7175] text-white font-semibold">
                            {ticketOwnerProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <span className="text-white font-medium text-[16px]">{ticketOwnerProfile?.displayName || 'User'}</span>
                             {ticketOwnerProfile?.phoneNumber && (
                                <div 
                                    className="flex items-center gap-1 text-[12px] text-[#8696a0] cursor-pointer hover:text-white transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(ticketOwnerProfile.phoneNumber);
                                        toast({ title: 'Copied!', description: 'Phone number copied to clipboard.' });
                                    }}
                                    title="Copy phone number"
                                >
                                    <span>{ticketOwnerProfile.phoneNumber}</span>
                                    <Copy className="h-3 w-3" />
                                </div>
                            )}
                        </div>
                        <span className="text-[13px] text-[#8696a0]">{ticket.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {canManageTicket && (
                        <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                            <SelectTrigger className="h-8 bg-transparent border-none text-white text-xs focus:ring-0 shadow-none hover:bg-white/5"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#233138] border-[#424d54] text-white">
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10 hover:bg-white/5"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#233138] border-[#424d54] text-white">
                            <DropdownMenuItem onClick={onDeleteClick} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* 2. SCROLLABLE AREA - This is the only part that scrolls */}
            <main 
                ref={messagesContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-[2px] custom-scrollbar" 
                style={{ 
                    backgroundImage: `url('/bg.png')`, 
                    backgroundBlendMode: 'overlay', 
                    backgroundColor: 'rgba(11, 20, 26, 0.98)',
                    backgroundSize: '400px'
                }}
            >
                {messagesWithDateSeparators.map((item, idx) => {
                    if (item.type === 'date-separator') {
                        return (
                            <div key={item.id} className="flex justify-center my-4 sticky top-0 z-10">
                                <span className="text-[12.5px] bg-[#182229] text-[#8696a0] px-3 py-1.5 rounded-[7.5px] shadow-sm uppercase">{item.date}</span>
                            </div>
                        );
                    }

                    const msg = item as WithId<ChatMessage>;
                    const isSender = msg.userId === user?.uid;
                    const prevItem = messagesWithDateSeparators[idx - 1];
                    const isFirstInBlock = !prevItem || (prevItem as any).type === 'date-separator' || (prevItem as any).userId !== msg.userId;

                    return (
                        <div key={msg.id} className={cn("flex w-full relative", isSender ? "justify-end" : "justify-start", isFirstInBlock ? "mt-2" : "mt-0")}>
                            {isFirstInBlock && (
                                <span className={cn("absolute top-0 z-[1]", isSender ? "-right-[7px]" : "-left-[7px]")}>
                                    <svg width="8" height="13" viewBox="0 0 8 13">
                                        <path d={isSender ? "M0,0 C3,0 8,0 8,0 L8,13 Z" : "M8,0 C5,0 0,0 0,0 L0,13 Z"} fill={isSender ? WA_COLORS.outgoing : WA_COLORS.incoming} />
                                    </svg>
                                </span>
                            )}

                            <div 
                                className={cn(
                                    "relative px-2 pt-1.5 pb-1 shadow-sm text-[14.2px] z-[2] inline-flex items-end gap-x-2",
                                    isSender ? "bg-[#005c4b] text-[#e9edef]" : "bg-[#202c33] text-[#e9edef]",
                                    isSender 
                                        ? (isFirstInBlock ? "rounded-l-[8px] rounded-br-[8px] rounded-tr-none" : "rounded-[8px]")
                                        : (isFirstInBlock ? "rounded-r-[8px] rounded-bl-[8px] rounded-tl-none" : "rounded-[8px]")
                                )}
                            >
                                <p className="whitespace-pre-wrap break-words leading-[19px] max-w-[500px]">{msg.text}</p>
                                <div className="flex items-center gap-1 shrink-0 mb-[-2px]">
                                    <span className="text-[10px] text-[#8696a0] whitespace-nowrap uppercase">
                                        {msg.createdAt ? format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'h:mm a') : ''}
                                    </span>
                                    {isSender && <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-[#53bdeb]" : "text-[#8696a0]")} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* 3. FIXED FOOTER - Stays at the bottom */}
            <footer className="flex-none p-2 bg-[#202c33] flex items-center gap-2 z-[100]">
                <Button variant="ghost" size="icon" className="text-[#8696a0] rounded-full h-10 w-10 hover:bg-white/5"><Smile className="h-6 w-6" /></Button>
                <div className="flex-1 bg-[#2a3942] rounded-[8px] px-4 py-2 flex items-center min-h-[42px]">
                    <Textarea
                        placeholder="Type a message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        className="bg-transparent border-none focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 text-[#e9edef] min-h-[24px] max-h-[120px] resize-none p-0 text-[18px] placeholder:text-[#8696a0] placeholder:text-[18px] w-full shadow-none outline-none ring-0 overflow-hidden"
                    />
                </div>
                <Button onClick={handleSendMessage} disabled={!message.trim()} className="h-11 w-11 rounded-full bg-[#00a884] hover:bg-[#06cf9c] shrink-0 p-0 shadow-md flex items-center justify-center transition-all active:scale-95">
                    <Send className="h-5 w-5 text-[#111b21] ml-0.5" fill="currentColor" />
                </Button>
            </footer>
        </div>
    );
}
