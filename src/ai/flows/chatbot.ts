
'use server';

/**
 * @fileOverview A simple conversational AI chatbot.
 *
 * - chatBot - A function that responds to a user's message.
 * - ChatBotInput - The input type for the chatBot function.
 * - ChatBotOutput - The return type for the chatBot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ChatBotInputSchema = z.object({
  message: z.string().describe("The user's message to the chatbot."),
});
export type ChatBotInput = z.infer<typeof ChatBotInputSchema>;

const ChatBotOutputSchema = z.object({
  response: z.string().describe("The chatbot's response to the user."),
});
export type ChatBotOutput = z.infer<typeof ChatBotOutputSchema>;

export async function chatBot(input: ChatBotInput): Promise<ChatBotOutput> {
  return chatBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatBotPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: {schema: ChatBotInputSchema},
  output: {schema: ChatBotOutputSchema},
  prompt: `You are a friendly and helpful IT support chatbot for Cheezious. Your goal is to assist users with their IT-related questions. Keep your responses concise, helpful, and professional.

IMPORTANT: You must only answer questions related to Information Technology (IT). If the user asks a question that is not about IT, you must politely decline to answer and remind them that you are an IT support assistant. For example, if asked about the weather, you could say: "I can only answer IT-related questions. How can I help you with your computer or network issues today?"

User message: {{{message}}}
`,
});

const chatBotFlow = ai.defineFlow(
  {
    name: 'chatBotFlow',
    inputSchema: ChatBotInputSchema,
    outputSchema: ChatBotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
