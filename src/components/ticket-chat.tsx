
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase } from '@/firebase';
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
    const [isSending, setIsSending] = useState(false);
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

    const handleSendMessage = async () => {
        if (!message.trim() || !user) return;
        setIsSending(true);

        const messagesCollection = collection(firestore, 'users', userId, 'issues', ticketId, 'messages');
        try {
            await addDoc(messagesCollection, {
                userId: user.uid,
                displayName: user.displayName || 'User',
                text: message,
                createdAt: serverTimestamp(),
            });
            setMessage('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        } finally {
            setIsSending(false);
        }
    };

     const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);

        try {
            const sRef = storageRef(storage, `tickets/${userId}/${ticketId}/images_${Date.now()}_${file.name}`);
            await uploadBytes(sRef, file);
            const imageUrl = await getDownloadURL(sRef);

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
        setIsSending(true);

        try {
            const sRef = storageRef(storage, `tickets/${userId}/${ticketId}/audio_${Date.now()}.webm`);
            await uploadBytes(sRef, audioBlob);
            const audioUrl = await getDownloadURL(sRef);

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
            setIsSending(false);
        }
    };
    
    const isInputDisabled = isSending || isRecording || isUploading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conversation</CardTitle>
                <CardDescription>Discuss the issue with the support team.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 h-96 overflow-y-auto p-4 border rounded-md mb-4 bg-muted">
                    {isLoading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {!isLoading && messages && messages.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages?.map((msg) => (
                        <div key={msg.id} className={cn("flex w-full items-end gap-3", msg.userId === user?.uid ? "justify-end" : "justify-start")}>
                             {/* Avatar for receiver */}
                            {msg.userId !== user?.uid && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{msg.displayName?.charAt(0) || 'S'}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "flex flex-col max-w-[70%]",
                                msg.userId === user?.uid ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "px-4 py-2 rounded-xl shadow-sm",
                                    msg.userId === user?.uid ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border rounded-bl-none"
                                )}>
                                    {msg.text && <p className="whitespace-pre-wrap text-sm">{msg.text}</p>}
                                    {msg.audioUrl && <AudioPlayer src={msg.audioUrl} />}
                                    {msg.imageUrl && (
                                        <div className="relative aspect-video w-64 cursor-pointer rounded-md overflow-hidden" onClick={() => window.open(msg.imageUrl, '_blank')}>
                                            <Image src={msg.imageUrl} alt="Attachment" layout="fill" className="object-cover" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground mt-1 px-1">
                                    {msg.displayName} - {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
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

                <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
                    {isRecording ? (
                        <Button size="icon" variant="destructive" onClick={handleStopRecording} disabled={isSending}>
                            <StopCircle className="h-5 w-5" />
                        </Button>
                    ) : (
                        <>
                            <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isInputDisabled}>
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleStartRecording} disabled={isInputDisabled}>
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
                        disabled={isInputDisabled}
                        className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[20px]"
                        rows={1}
                    />
                    {isInputDisabled && !isRecording ? (
                        <div className='p-2'>
                           <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : !isRecording && (
                        <Button size="icon" variant="ghost" onClick={handleSendMessage} disabled={!message.trim()}>
                            <Send className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

    