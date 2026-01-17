
'use server';

import { chatBot } from '@/ai/flows/chatbot';

export async function chatBotAction(message: string) {
  if (!message) {
    return { error: 'Message cannot be empty.' };
  }
  try {
    const result = await chatBot({ message });
    return result;
  } catch (error: any) {
    console.error('AI ChatBot Error:', error);
    return { error: `Sorry, there was an issue with the AI service: ${error.message}` };
  }
}
