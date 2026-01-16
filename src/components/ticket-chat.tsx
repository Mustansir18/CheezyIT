
'use client';

import { useState, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter, useStorage, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Send, Mic, Copy, CheckCheck } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AudioPlayer from './audio-player';


interface TicketChatProps {
    ticketId: string;
    userId: string; // This is the ticket owner's ID
    canManageTicket: boolean;
    isOwner: boolean;
}

type UserProfile = {
    displayName: string;
    phoneNumber?: string;
}

export default function TicketChat({ ticketId, userId, canManageTicket, isOwner }: TicketChatProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const messagesContainerRef = useRef<HTMLDivElement>(null);

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

    // Effect to mark messages as read when the chat is opened
    useEffect(() => {
        if (!ticketRef) return;
        if (isOwner) {
            updateDoc(ticketRef, { unreadByUser: false });
        } else if (canManageTicket) {
            updateDoc(ticketRef, { unreadByAdmin: false });
        }
    }, [ticketRef, isOwner, canManageTicket]);

    // Effect to mark messages from OTHERS as read when they become visible
    useEffect(() => {
        if (!firestore || !user || !messages || messages.length === 0) return;

        const unreadMessagesFromOthers = messages.filter(
            msg => !msg.isRead && msg.userId !== user.uid
        );

        if (unreadMessagesFromOthers.length > 0) {
            unreadMessagesFromOthers.forEach(msg => {
                if (msg.id) {
                    const msgRef = doc(firestore, 'users', userId, 'issues', ticketId, 'messages', msg.id);
                    // Use a non-blocking update, no need to await
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

    const uploadAndSendAudio = (audioBlob: Blob) => {
        if (!user || !ticketRef) return;
        setIsUploading(true);

        const storageRef = ref(storage, `tickets/${userId}/${ticketId}/${Date.now()}.webm`);

        uploadBytes(storageRef, audioBlob)
            .then(snapshot => getDownloadURL(snapshot.ref))
            .then(downloadURL => {
                const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
                const messageData = {
                    userId: user.uid,
                    displayName: user.displayName || 'User',
                    audioUrl: downloadURL,
                    type: 'user' as const,
                    createdAt: serverTimestamp(),
                    isRead: false,
                };
                return addDoc(messagesCollection, messageData);
            })
            .then(() => {
                const updateData = isOwner ? { unreadByAdmin: true, updatedAt: serverTimestamp() } : { unreadByUser: true, updatedAt: serverTimestamp() };
                updateDoc(ticketRef, updateData);
            })
            .then(() => {
                setIsUploading(false);
            })
            .catch(error => {
                console.error("Error uploading or sending voice note:", error);
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: error.code === 'storage/unauthorized' 
                        ? "You don't have permission to upload files." 
                        : "Could not send the voice note. Please try again."
                });
                setIsUploading(false);
            });
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                uploadAndSendAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop the mic access
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error starting recording:", error);
            toast({
                variant: 'destructive',
                title: 'Recording Error',
                description: 'Could not start recording. Please check microphone permissions.',
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };


    return (
        <Card className='flex flex-col'>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Conversation</CardTitle>
                         <CardDescription className="flex items-center gap-2 mt-1">
                            {profileLoading ? (
                                'Loading user details...'
                            ) : ticketOwnerProfile ? (
                                <>
                                    <span>{ticketOwnerProfile.displayName}</span>
                                    {ticketOwnerProfile.phoneNumber && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <span>- {ticketOwnerProfile.phoneNumber}</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleCopy(ticketOwnerProfile.phoneNumber)}
                                                        >
                                                            <Copy className="h-4 w-4" />
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
                            ) : (
                                'Discuss the issue with the support team.'
                            )}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent ref={messagesContainerRef} className="h-96 overflow-y-auto p-4 bg-muted/50 flex-grow">
                    {isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {!isLoading && messages && messages.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages?.map((msg, index) => {
                        const isSender = msg.userId === user?.uid;
                        const senderName = isSender ? user?.displayName : ticketOwnerProfile?.displayName;
                        
                        if (msg.type === 'call_request') {
                           return null;
                        }

                        const prevMessage = messages[index - 1];
                        const nextMessage = messages[index + 1];

                        const isFirstInGroup = !prevMessage || prevMessage.userId !== msg.userId;
                        const isLastInGroup = !nextMessage || nextMessage.userId !== msg.userId;

                        return (
                            <div key={msg.id} className={cn(
                                "flex w-full items-start gap-2.5", 
                                isSender ? "justify-end" : "justify-start",
                                isFirstInGroup ? "mt-4" : "mt-0.5"
                            )}>
                                {!isSender && (
                                    isLastInGroup ? 
                                    <Avatar className="h-8 w-8 self-end">
                                        <AvatarFallback>{senderName?.charAt(0) || 'S'}</AvatarFallback>
                                    </Avatar> :
                                    <div className="w-8 flex-shrink-0"></div>
                                )}

                                <div className={cn(
                                    "flex flex-col max-w-[70%]",
                                    isSender ? "items-end" : "items-start"
                                )}>
                                    {isFirstInGroup && (
                                        <span className="text-xs text-muted-foreground px-1 mb-0.5">
                                            {senderName || msg.displayName}
                                        </span>
                                    )}
                                    <div
                                      className={cn(
                                        "p-3 shadow-sm flex flex-col",
                                        isSender
                                          ? "bg-[#DCF8C6] text-black rounded-t-xl rounded-l-xl"
                                          : "bg-white text-black border rounded-t-xl rounded-r-xl",
                                        isLastInGroup && (isSender ? "rounded-br-none" : "rounded-bl-none"),
                                      )}
                                    >
                                        {msg.audioUrl ? (
                                            <AudioPlayer src={msg.audioUrl} />
                                        ) : (
                                            <p className="whitespace-pre-wrap text-base leading-relaxed break-words">
                                                {msg.text}
                                            </p>
                                        )}
                                        <div className="self-end text-[11px] mt-1 flex items-center justify-end gap-1 text-gray-600/80">
                                            {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isSender && (
                                                <CheckCheck className={cn("h-4 w-4", msg.isRead ? "text-chart-1" : "text-gray-400")} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {isSender && (
                                    isLastInGroup ?
                                    <Avatar className="h-8 w-8 self-end">
                                        <AvatarFallback>{senderName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar> :
                                    <div className="w-8 flex-shrink-0"></div>
                                )}
                            </div>
                        )
                    })}
            </CardContent>

             <div className="border-t p-3 bg-background">
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
                        className="min-h-12 resize-none border-gray-300 rounded-lg p-3 pr-32 shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                     <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={toggleRecording}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Mic className={cn("h-5 w-5", isRecording && "text-red-500 animate-pulse")} />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isRecording ? 'Stop recording' : 'Record voice note'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                       <Button type="submit" size="sm" onClick={handleSendMessage} disabled={!message.trim()}>
                            Send
                            <Send className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

    