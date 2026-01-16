
'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Mic, Send, StopCircle, CornerDownLeft } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/data';
import AudioPlayer from '@/components/audio-player';

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
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload voice note.' });
        } finally {
            setIsSending(false);
        }
    };

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
                        <div key={msg.id} className={cn("flex items-end gap-2", msg.userId === user?.uid ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "flex flex-col space-y-1 text-sm max-w-xs mx-2",
                                msg.userId === user?.uid ? "order-1 items-end" : "order-2 items-start"
                            )}>
                                 <div className={cn(
                                     "px-4 py-2 rounded-lg inline-block",
                                     msg.userId === user?.uid ? "bg-primary text-primary-foreground" : "bg-card border"
                                 )}>
                                    {msg.text && <p>{msg.text}</p>}
                                    {msg.audioUrl && <AudioPlayer src={msg.audioUrl} />}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {msg.displayName} - {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="relative">
                    <Textarea
                        placeholder={isRecording ? `Recording... (${Math.floor(recordingTime/60)}:${(recordingTime%60).toString().padStart(2,'0')})` : "Type your message..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={isSending || isRecording}
                        className="pr-20"
                    />
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
                        {isRecording ? (
                            <Button size="icon" variant="destructive" onClick={handleStopRecording} disabled={isSending}>
                                <StopCircle className="h-5 w-5" />
                                <span className="sr-only">Stop Recording</span>
                            </Button>
                        ) : (
                            <>
                                <Button size="icon" variant="ghost" onClick={handleSendMessage} disabled={isSending || !message.trim()}>
                                    <Send className="h-5 w-5" />
                                    <span className="sr-only">Send Message</span>
                                </Button>
                                <Button size="icon" variant="ghost" onClick={handleStartRecording} disabled={isSending}>
                                    <Mic className="h-5 w-5" />
                                    <span className="sr-only">Record Voice Note</span>
                                </Button>
                            </>
                        )}
                        
                    </div>
                </div>
                 <p className="text-xs text-muted-foreground mt-2">
                    <CornerDownLeft className="inline-block h-3 w-3 mr-1" />
                    <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line.
                </p>
            </CardContent>
        </Card>
    );
}
