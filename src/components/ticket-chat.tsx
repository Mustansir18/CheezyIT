
'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Loader2, Send, Phone } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface TicketChatProps {
    ticketId: string;
    userId: string;
}

export default function TicketChat({ ticketId, userId }: TicketChatProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [message, setMessage] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(
        () => query(collection(firestore, 'users', userId, 'issues', ticketId, 'messages'), orderBy('createdAt', 'asc')),
        [firestore, userId, ticketId]
    );
    const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
        };

        addDoc(messagesCollection, messageData)
          .catch((serverError) => {
            console.error("Error sending message:", serverError);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send message.',
            });
            setMessage(messageToSend); // Restore message on failure

            const contextualError = new FirestorePermissionError({
                path: messagesCollection.path,
                operation: 'create',
                requestResourceData: messageData
            });
            errorEmitter.emit('permission-error', contextualError);
        });
    };

    const handleRequestCall = () => {
        if (!user) return;

        const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
        const callRequestData = {
            userId: user.uid,
            displayName: user.displayName || 'User',
            type: 'call_request' as const,
            createdAt: serverTimestamp(),
        };
        
        addDoc(messagesCollection, callRequestData)
          .catch((serverError) => {
            console.error("Error sending call request:", serverError);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send call request.',
            });

            const contextualError = new FirestorePermissionError({
                path: messagesCollection.path,
                operation: 'create',
                requestResourceData: callRequestData
            });
            errorEmitter.emit('permission-error', contextualError);
        });
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Conversation</CardTitle>
                        <CardDescription>Discuss the issue with the support team.</CardDescription>
                    </div>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={handleRequestCall} disabled={!user}>
                                    <Phone className="h-5 w-5" />
                                    <span className="sr-only">Request a Call</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Request a Call</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 h-96 overflow-y-auto p-4 border rounded-md mb-4 bg-muted/50">
                    {isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {!isLoading && messages && messages.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages?.map((msg) => {
                        if (msg.type === 'call_request') {
                            return (
                                <div key={msg.id} className="flex justify-center items-center my-4">
                                    <div className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        <span>{msg.userId === user?.uid ? 'You requested' : `${msg.displayName} requested`} a call</span>
                                        <span className="text-xs text-muted-foreground/80">
                                            {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div key={msg.id} className={cn("flex w-full items-start gap-3", msg.userId === user?.uid ? "justify-end" : "justify-start")}>
                                {msg.userId !== user?.uid && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{msg.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn(
                                    "flex flex-col gap-1 max-w-[70%]",
                                    msg.userId === user?.uid ? "items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "px-3 py-2 rounded-xl",
                                        msg.userId === user?.uid ? "bg-primary text-primary-foreground" : "bg-background"
                                    )}>
                                        <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {msg.displayName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                {msg.userId === user?.uid && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
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
                        className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0">
                        <div className="ml-auto">
                           <Button type="submit" size="sm" onClick={handleSendMessage} disabled={!message.trim()}>
                                Send
                                <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
