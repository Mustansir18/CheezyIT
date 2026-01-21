'use server';
/**
 * @fileOverview An AI flow to generate an automated reply for a new IT support ticket.
 *
 * - generateAutoReply - A function that calls the Genkit flow to generate a reply.
 * - AutoReplyInput - The input type for the flow.
 * - AutoReplyOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutoReplyInputSchema = z.object({
  title: z.string().describe('The title of the support ticket.'),
  description: z.string().describe('The detailed description of the issue.'),
  issueType: z.string().describe('The category of the issue.'),
});
export type AutoReplyInput = z.infer<typeof AutoReplyInputSchema>;

const AutoReplyOutputSchema = z.object({
  replyText: z.string().describe('The generated reply to the user.'),
});
export type AutoReplyOutput = z.infer<typeof AutoReplyOutputSchema>;

export async function generateAutoReply(input: AutoReplyInput): Promise<AutoReplyOutput> {
  return autoReplyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoReplyPrompt',
  input: {schema: AutoReplyInputSchema},
  output: {schema: AutoReplyOutputSchema},
  prompt: `You are a friendly and helpful AI assistant for the Cheezious IT Support desk.

Your task is to generate an initial, empathetic, and reassuring reply to a user who has just submitted a support ticket.

**Do not try to solve the problem.** Your only goal is to acknowledge the ticket, reassure the user that it has been received, and let them know that a support agent will be with them shortly.

Keep the tone professional but friendly.

The user submitted the following ticket:
- Issue Type: {{{issueType}}}
- Title: {{{title}}}
- Description: {{{description}}}

Generate a suitable reply and put it in the 'replyText' field.`,
});

const autoReplyFlow = ai.defineFlow(
  {
    name: 'autoReplyFlow',
    inputSchema: AutoReplyInputSchema,
    outputSchema: AutoReplyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
