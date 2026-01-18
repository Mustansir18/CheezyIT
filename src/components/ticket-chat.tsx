
'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, type WithId } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { ArrowLeft, MoreVertical, Trash2, CheckCheck, Smile, Send, Phone, Users } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import AudioPlayer from '@/components/audio-player';
import { useSound } from '@/hooks/use-sound';

const WA_COLORS = {
    bg: '#0b141a',
    header: '#202c33',
    outgoing: '#005c4b',
    incoming: '#202c33',
    dateBg: '#182229',
    blue: '#53bdeb'
};

export default function TicketChat({ ticket, canManageTicket, isOwner, backLink, onStatusChange, onDeleteClick, onReopenTicket, onReferTicket }: any) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const { id: ticketId, userId } = ticket;

    const userProfileRef = useMemoFirebase(() => (userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
    const { data: ticketOwnerProfile } = useDoc<any>(userProfileRef);
    const messagesQuery = useMemoFirebase(() => query(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), orderBy('createdAt', 'asc')), [firestore, userId, ticketId]);
    const { data: messages, isLoading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);
    
    const playMessageSound = useSound('/sounds/new-message.mp3');
    const prevUnreadCountRef = useRef<number | undefined>(undefined);

    const unreadMessagesCount = useMemo(() => {
        if (!messages || !user) return 0;
        return messages.filter(m => !m.isRead && m.userId !== user.uid).length;
    }, [messages, user]);

    useLayoutEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (messagesLoading) return;

        if (prevUnreadCountRef.current === undefined) {
            prevUnreadCountRef.current = unreadMessagesCount;
            return;
        }

        if (unreadMessagesCount > prevUnreadCountRef.current) {
            playMessageSound();
        }

        prevUnreadCountRef.current = unreadMessagesCount;
    }, [unreadMessagesCount, messagesLoading, playMessageSound]);


    // Effect to mark messages as read and clear ticket-level unread flags
    useEffect(() => {
        if (!messages || messagesLoading || !user || !firestore || !ticket) return;

        // --- Part 1: Mark individual messages as read ---
        const messageUpdateBatch = writeBatch(firestore);
        let messagesToMarkAsRead = 0;

        messages.forEach(msg => {
            // Find unread messages sent by the *other* user
            if (!msg.isRead && msg.userId !== user.uid) {
                const msgRef = doc(firestore, 'users', userId, 'issues', ticketId, 'messages', msg.id);
                messageUpdateBatch.update(msgRef, { isRead: true });
                messagesToMarkAsRead++;
            }
        });

        // Commit the batch only if there are updates to be made
        if (messagesToMarkAsRead > 0) {
            messageUpdateBatch.commit().catch(err => {
                console.error("Failed to mark messages as read:", err);
            });
        }

        // --- Part 2: Update the ticket-level unread flag ---
        const ticketRef = doc(firestore, 'users', userId, 'issues', ticketId);

        // If the current viewer is an admin/support and the ticket has an unread flag for them
        if (canManageTicket && ticket.unreadByAdmin) {
            updateDoc(ticketRef, { unreadByAdmin: false });
        }
        
        // If the current viewer is the ticket owner and the ticket has an unread flag for them
        if (isOwner && ticket.unreadByUser) {
            updateDoc(ticketRef, { unreadByUser: false });
        }

    }, [messages, messagesLoading, user, firestore, ticketId, userId, ticket, canManageTicket, isOwner]);


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

    const handleSendMessage = async () => {
        if (!message.trim() || !user) return;
        const msgText = message;
        setMessage('');

        const ticketRef = doc(firestore, 'users', userId, 'issues', ticketId);
        // Create a ref for the new message doc with a new ID
        const newMessageRef = doc(collection(ticketRef, 'messages'));

        // Determine which unread flag to set based on who is sending
        const unreadUpdate = canManageTicket ? { unreadByUser: true } : { unreadByAdmin: true };

        try {
            const batch = writeBatch(firestore);

            // 1. Set the data for the new message
            batch.set(newMessageRef, {
                userId: user.uid,
                displayName: user.displayName || 'User',
                text: msgText,
                createdAt: serverTimestamp(),
                isRead: false,
                type: 'user',
            });

            // 2. Update the parent ticket's unread status and updatedAt timestamp
            batch.update(ticketRef, {
                ...unreadUpdate,
                updatedAt: serverTimestamp(),
            });

            await batch.commit();
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        }
    };

    const handleStartCall = async () => {
        if (!user || !ticketOwnerProfile?.phoneNumber) {
            toast({ variant: 'destructive', title: 'Error', description: 'User does not have a phone number.' });
            return;
        }
        const whatsappNumber = '92' + ticketOwnerProfile.phoneNumber.substring(1);
        const callLink = `https://wa.me/${whatsappNumber}`;

        await addDoc(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), {
            userId: user.uid,
            displayName: user.displayName || 'Admin',
            type: 'call_request',
            link: callLink,
            text: 'Voice call request',
            createdAt: serverTimestamp(),
            isRead: false,
        });
    };


    return (
        <div className="flex flex-col h-screen w-full overflow-hidden" style={{ backgroundColor: WA_COLORS.bg }}>
            
            <header className="flex-none w-full flex items-center justify-between px-4 py-2 z-20 border-b border-white/5" 
                    style={{ backgroundColor: WA_COLORS.header }}>
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
                                <span className="text-[12px] text-[#8696a0]">{ticketOwnerProfile.phoneNumber}</span>
                            )}
                        </div>
                        <span className="text-[13px] text-[#8696a0] truncate max-w-[200px]">{ticket.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {canManageTicket && (
                        <>
                            <Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10 hover:bg-white/5" onClick={handleStartCall} disabled={!ticketOwnerProfile?.phoneNumber}>
                                <Phone className="h-5 w-5" />
                            </Button>
                            <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status}>
                                <SelectTrigger className="h-8 bg-transparent border-none text-white text-xs focus:ring-0 shadow-none hover:bg-white/5"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#233138] border-[#424d54] text-white">
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10 hover:bg-white/5"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#233138] border-[#424d54] text-white">
                            {canManageTicket && ticket.status === 'In Progress' && (
                                <DropdownMenuItem onClick={onReferTicket} className="cursor-pointer">
                                    <Users className="mr-2 h-4 w-4" /> Refer to Queue
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={onDeleteClick} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <main 
                ref={messagesContainerRef} 
                className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" 
                style={{ 
                    backgroundImage: `url('/bg.png')`, 
                    backgroundBlendMode: 'overlay', 
                    backgroundColor: 'rgba(11, 20, 26, 0.98)',
                    backgroundSize: '400px',
                    backgroundAttachment: 'local'
                }}
            >
                <div className="flex flex-col py-4">
                    {messagesWithDateSeparators.map((item, idx) => {
                        if (item.type === 'date-separator') {
                            return (
                                <div key={item.id} className="flex justify-center my-4 sticky top-2 z-10">
                                    <span className="text-[12.5px] bg-[#182229] text-[#8696a0] px-3 py-1.5 rounded-[7.5px] shadow-sm uppercase">{item.date}</span>
                                </div>
                            );
                        }

                        const msg = item as WithId<ChatMessage>;
                        const isSender = msg.userId === user?.uid;
                        const prevItem = messagesWithDateSeparators[idx - 1];

                        const isFirstInBlock = !prevItem || (prevItem as any).type === 'date-separator' || (prevItem as any).userId !== msg.userId;
                        
                        const messageContent = () => {
                            if (msg.audioUrl) {
                                return <AudioPlayer src={msg.audioUrl} />;
                            }
                            if (msg.type === 'call_request' && msg.link) {
                                return (
                                    <div className="flex flex-col items-start gap-3">
                                        <div className='flex items-center gap-2'>
                                            <div className='w-10 h-10 rounded-full bg-green-500/80 flex items-center justify-center'>
                                                <Phone className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white/90">Voice call</p>
                                                <p className="text-sm text-white/70">WhatsApp call</p>
                                            </div>
                                        </div>
                                        <div className='w-full border-t border-white/10 my-1'></div>
                                        <Button asChild size="sm" variant="ghost" className="w-full justify-center text-center !text-blue-400 hover:!text-blue-300 !p-0 h-auto hover:bg-white/10">
                                            <Link href={msg.link} target="_blank" rel="noopener noreferrer">
                                                Join Call
                                            </Link>
                                        </Button>
                                    </div>
                                );
                            }
                            if (msg.text) {
                                 return <p className="whitespace-pre-wrap break-words leading-[19px] max-w-[500px]">{msg.text}</p>;
                            }
                            return null;
                        };
                        
                        return (
                            <div 
                                key={msg.id} 
                                className={cn(
                                    "flex w-full relative px-4",
                                    isSender ? "justify-end" : "justify-start", 
                                    isFirstInBlock ? "mt-3" : "mt-[2px]"
                                )}
                            >
                                <div 
                                    className={cn(
                                        "relative px-3 pt-1.5 pb-1 shadow-sm text-[14.2px] z-[2] inline-flex items-end gap-x-2",
                                        isSender ? "bg-[#005c4b] text-[#e9edef]" : "bg-[#202c33] text-[#e9edef]",
                                        "rounded-[8px]",
                                        isSender 
                                            ? (isFirstInBlock ? "rounded-tr-none" : "") 
                                            : (isFirstInBlock ? "rounded-tl-none" : ""),
                                        "max-w-[65%] md:max-w-[45%]", 
                                        (msg.type === 'call_request' || msg.audioUrl) && 'w-64'
                                    )}
                                >
                                    <div className="flex-1 overflow-hidden">
                                        {messageContent()}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 mb-[-2px] self-end">
                                        <span className="text-[10px] text-[#8696a0] whitespace-nowrap uppercase">
                                            {msg.createdAt ? format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), 'h:mm a') : ''}
                                        </span>
                                        {isSender && (
                                            <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-[#53bdeb]" : "text-[#8696a0]")} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <footer className="flex-none p-2 bg-[#202c33] flex items-center gap-2 z-20 border-t border-white/5">
                {ticket.status === 'Resolved' ? (
                    <div className="w-full text-center p-2">
                        <p className="text-sm text-white/80">This ticket is marked as resolved.</p>
                        {isOwner && (
                            <div className="flex justify-center gap-4 mt-3">
                                <Button variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white">Yes, it's fixed</Button>
                                <Button onClick={onReopenTicket} className="bg-red-600 hover:bg-red-700 text-white">No, reopen ticket</Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10 hover:bg-white/5">
                            <Smile className="h-6 w-6" />
                        </Button>
                        <div className="flex-1 bg-[#2a3942] rounded-[8px] px-4 py-2 flex items-center min-h-[42px]">
                            <Textarea
                                placeholder="Type a message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                className="bg-transparent border-none focus-visible:ring-0 text-[#e9edef] min-h-[24px] max-h-[120px] resize-none p-0 text-[16px] w-full"
                            />
                        </div>
                        <Button onClick={handleSendMessage} disabled={!message.trim()} className="h-11 w-11 rounded-full bg-[#00a884] hover:bg-[#06cf9c] shrink-0 p-0 shadow-md">
                            <Send className="h-5 w-5 text-[#111b21] ml-0.5" fill="currentColor" />
                        </Button>
                    </>
                )}
            </footer>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
                }
            `}</style>
        </div>
    );
}
