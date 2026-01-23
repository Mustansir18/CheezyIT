
'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreVertical, Trash2, CheckCheck, Smile, Send, Phone, Users, UserCheck, Check } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatMessage, Ticket, TicketStatus } from '@/lib/data';
import { TICKET_STATUS_LIST } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
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

const mockMessages: ChatMessage[] = [
    {
        id: '1',
        userId: 'demo-user-id',
        displayName: 'Demo User',
        text: 'My laptop is not connecting to the office Wi-Fi. I have tried restarting it but it did not work. Please help.',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        isRead: true,
        type: 'user',
    },
    {
        id: '2',
        userId: 'support-user-id',
        displayName: 'Support Person',
        text: 'Hi there, I will look into this for you. Can you please provide your AnyDesk ID?',
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
        isRead: true,
        type: 'user',
    },
];

export default function TicketChat({ ticket, ticketOwnerProfile, canManageTicket, isOwner, backLink, assignableUsers, onStatusChange, onAssignmentChange, onDeleteClick, onReopenTicket, onTakeOwnership, onReturnToQueue, onBackToDetail }: any) {
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>(mockMessages);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isLocked = ticket.status === 'Closed';

    const currentUser = useMemo(() => {
        const userJson = localStorage.getItem('mockUser');
        return userJson ? JSON.parse(userJson) : null;
    }, []);

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
                const messageDate = format(new Date(msg.createdAt), 'dd/MM/yyyy');
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
        if (!message.trim() || !currentUser) return;
        const msgText = message;
        setMessage('');

        const newMessage = {
            id: Date.now().toString(),
            userId: currentUser.email, // using email as id for mock
            displayName: currentUser.displayName || 'User',
            text: msgText,
            createdAt: new Date(),
            isRead: false,
            type: 'user',
        };
        setMessages(m => [...m, newMessage]);
        toast({ title: 'Message Sent (Mock)', description: 'Your message has been sent.' });
    };

    const handleStartCall = async () => {
       toast({ variant: 'destructive', title: 'Error', description: 'This feature is disabled.' });
    };


    return (
        <div className="flex flex-col h-screen w-full overflow-hidden" style={{ backgroundColor: WA_COLORS.bg }}>
            
            <header className="flex-none w-full flex items-center justify-between px-4 py-2 z-20 border-b border-white/5" 
                    style={{ backgroundColor: WA_COLORS.header }}>
                <div className="flex items-center gap-3">
                    {onBackToDetail ? (
                        <Button variant="ghost" size="icon" onClick={onBackToDetail} className="text-[#aebac1] hover:text-white transition-colors h-10 w-10 p-0 rounded-full">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    ) : (
                        <Link href={backLink} className="text-[#aebac1] hover:text-white transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                    )}
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#6a7175] text-white font-semibold">
                            {ticketOwnerProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <span className="text-white font-medium text-[16px]">{ticketOwnerProfile?.displayName || 'User'}</span>
                             <span className="text-[12px] text-accent/80 font-semibold">{ticket.ticketId}</span>
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
                            
                            {(ticket.status === 'Open') && !ticket.assignedTo && (
                                <Button onClick={onTakeOwnership} size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white gap-2">
                                   <Check className="h-4 w-4" /> Check
                                </Button>
                            )}

                            <Select onValueChange={(value) => onStatusChange(value as TicketStatus)} defaultValue={ticket.status} disabled={isLocked}>
                                <SelectTrigger className="h-8 bg-transparent border-none text-white text-xs focus:ring-0 shadow-none hover:bg-white/5 w-auto gap-1"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#233138] border-[#424d54] text-white">
                                    {TICKET_STATUS_LIST.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={isLocked}>
                                    <Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10 hover:bg-white/5">
                                        <UserCheck className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#233138] border-[#424d54] text-white">
                                    <DropdownMenuRadioGroup value={ticket.assignedTo} onValueChange={onAssignmentChange}>
                                        <DropdownMenuRadioItem value="">Unassigned</DropdownMenuRadioItem>
                                        {assignableUsers.map((u: any) => (
                                            <DropdownMenuRadioItem key={u.id} value={u.id}>{u.displayName}</DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-[#aebac1] rounded-full h-10 w-10 hover:bg-white/5"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#233138] border-[#424d54] text-white">
                            {canManageTicket && ticket.assignedTo && (
                                <DropdownMenuItem onClick={onReturnToQueue} className="cursor-pointer">
                                    <Users className="mr-2 h-4 w-4" /> Return to Queue
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={onDeleteClick} disabled={isLocked} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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

                        const msg = item as any;
                        const isSender = msg.userId === currentUser?.email;
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
                                            {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}
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
                {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                    <div className="w-full text-center p-2">
                        <p className="text-sm text-white/80">This ticket is {ticket.status.toLowerCase()}.</p>
                        {isOwner && ticket.status === 'Resolved' && (
                            <div className="flex justify-center gap-4 mt-3">
                                <Button variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white" onClick={() => onStatusChange('Closed')}>Confirm as Closed</Button>
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
