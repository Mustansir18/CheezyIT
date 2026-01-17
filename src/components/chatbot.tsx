
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatBotAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
};

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'Hello! How can I help you with your IT issues today?' }
  ]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    startTransition(async () => {
      const result = await chatBotAction(currentInput);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'ChatBot Error',
          description: result.error,
        });
        const errorMessage: ChatMessage = { sender: 'bot', text: result.error };
        setMessages(prev => [...prev, errorMessage]);
      } else if (result.response) {
        const botMessage: ChatMessage = { sender: 'bot', text: result.response };
        setMessages(prev => [...prev, botMessage]);
      }
    });
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-accent" />
          <CardTitle>AI Assistant</CardTitle>
        </div>
        <CardDescription>Ask me any IT-related questions.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'bot' && <Bot className="h-5 w-5 shrink-0 text-primary" />}
                <div className={`rounded-lg px-3 py-2 max-w-sm ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 shrink-0 text-primary" />
                <div className="rounded-lg px-3 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
            placeholder="Type your message..."
            disabled={isPending}
          />
          <Button onClick={handleSendMessage} disabled={isPending || !input.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
