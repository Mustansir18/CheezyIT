'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Mic, Send, StopCircle, CornerDownLeft, Paperclip } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/data';
import AudioPlayer from '@/components/audio-player';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface TicketChatProps {
    ticketId: string;
    userId: string;
}

export default function TicketChat({ ticketId, userId }: TicketChatProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


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

    useEffect(() => {
        if (isRecording) {
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            setRecordingTime(0);
        }
        return () => {
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    }, [isRecording])

    const handleSendMessage = () => {
        if (!message.trim() || !user) return;

        const messageToSend = message;
        setMessage(''); // Optimistically clear the input field

        const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
        const messageData = {
            userId: user.uid,
            displayName: user.displayName || 'User',
            text: messageToSend,
            createdAt: serverTimestamp(),
        };

        // Non-blocking write. UI updates via onSnapshot listener.
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

     const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);

        try {
            const sRef = storageRef(storage, `tickets/${userId}/${ticketId}/images_${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytes(sRef, file);
            const imageUrl = await getDownloadURL(uploadTask.ref);

            const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
            await addDoc(messagesCollection, {
                userId: user.uid,
                displayName: user.displayName || 'User',
                imageUrl: imageUrl,
                createdAt: serverTimestamp(),
            });

        } catch (error: any) {
            console.error(error);
            let description = 'Failed to upload image.';
            if (error.code === 'storage/unauthorized') {
                description = "Permission denied: You don't have access to upload images.";
            }
            toast({ variant: 'destructive', title: 'Error', description });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                handleSendVoiceNote(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Microphone access denied. Please enable it in your browser settings.' });
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSendVoiceNote = async (audioBlob: Blob) => {
        if (!user) return;
        setIsUploading(true); // Use isUploading state for voice notes as well

        try {
            const sRef = storageRef(storage, `tickets/${userId}/${ticketId}/audio_${Date.now()}.webm`);
            const uploadTask = await uploadBytes(sRef, audioBlob);
            const audioUrl = await getDownloadURL(uploadTask.ref);

            const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
            await addDoc(messagesCollection, {
                userId: user.uid,
                displayName: user.displayName || 'User',
                audioUrl: audioUrl,
                createdAt: serverTimestamp(),
            });
        } catch (error: any) {
            console.error(error);
            let description = 'Failed to upload voice note.';
            if (error.code === 'storage/unauthorized') {
                description = "Permission denied: You don't have access to upload audio.";
            }
            toast({ variant: 'destructive', title: 'Error', description });
        } finally {
            setIsUploading(false);
        }
    };
    
    const mediaButtonsDisabled = isRecording || isUploading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conversation</CardTitle>
                <CardDescription>Discuss the issue with the support team.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 h-96 overflow-y-auto p-4 border rounded-md mb-4 bg-muted/50">
                    {isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {!isLoading && messages && messages.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages?.map((msg) => (
                        <div key={msg.id} className={cn("flex w-full items-start gap-3", msg.userId === user?.uid ? "justify-end" : "justify-start")}>
                             {/* Avatar for receiver */}
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
                                    {msg.text && <p className="whitespace-pre-wrap text-sm">{msg.text}</p>}
                                    {msg.audioUrl && <AudioPlayer src={msg.audioUrl} />}
                                    {msg.imageUrl && (
                                        <div className="relative aspect-video w-64 cursor-pointer rounded-md overflow-hidden" onClick={() => window.open(msg.imageUrl, '_blank')}>
                                            <Image src={msg.imageUrl} alt="Attachment" layout="fill" className="object-cover" />
                                        </div>
                                    )}
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
                            {/* Avatar for sender */}
                            {msg.userId === user?.uid && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
                    <Textarea
                        placeholder={isRecording ? `Recording... (${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')})` : "Type a message..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={isRecording}
                        className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center p-3 pt-0">
                         {isRecording ? (
                            <Button size="icon" variant="destructive" onClick={handleStopRecording} disabled={isUploading}>
                                <StopCircle className="h-5 w-5" />
                            </Button>
                        ) : (
                            <>
                                <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={mediaButtonsDisabled}>
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={handleStartRecording} disabled={mediaButtonsDisabled}>
                                    <Mic className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <div className="ml-auto">
                            {isUploading && !isRecording && (
                               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            )}
                            {!isUploading && !isRecording && (
                                <Button type="submit" size="sm" onClick={handleSendMessage} disabled={!message.trim()}>
                                    Send
                                    <Send className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}