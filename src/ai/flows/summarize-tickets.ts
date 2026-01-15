'use server';

/**
 * @fileOverview Summarizes open IT support tickets for a user.
 *
 * - summarizeTickets - A function that summarizes the user's open tickets.
 * - SummarizeTicketsInput - The input type for the summarizeTickets function.
 * - SummarizeTicketsOutput - The return type for the summarizeTickets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTicketsInputSchema = z.object({
  tickets: z.array(
    z.object({
      ticketId: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      priority: z.string(),
    })
  ).describe('An array of open IT support tickets for a user.'),
});
export type SummarizeTicketsInput = z.infer<typeof SummarizeTicketsInputSchema>;

const SummarizeTicketsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the user\'s open tickets.'),
});
export type SummarizeTicketsOutput = z.infer<typeof SummarizeTicketsOutputSchema>;

export async function summarizeTickets(input: SummarizeTicketsInput): Promise<SummarizeTicketsOutput> {
  return summarizeTicketsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTicketsPrompt',
  input: {schema: SummarizeTicketsInputSchema},
  output: {schema: SummarizeTicketsOutputSchema},
  prompt: `You are an IT support agent summarizing open tickets for a user. Provide a concise summary of the following tickets, highlighting the key issues and overall status. Be professional and brief.

{% each tickets %}
Ticket ID: {{{ticketId}}}
Title: {{{title}}}
Description: {{{description}}}
Status: {{{status}}}
Priority: {{{priority}}}
{% endeach %}
`,
});

const summarizeTicketsFlow = ai.defineFlow(
  {
    name: 'summarizeTicketsFlow',
    inputSchema: SummarizeTicketsInputSchema,
    outputSchema: SummarizeTicketsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
