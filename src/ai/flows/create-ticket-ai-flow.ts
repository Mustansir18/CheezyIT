'use server';
/**
 * @fileOverview An AI flow to extract structured ticket information from a user's natural language description.
 *
 * - extractTicketInfo - A function that calls the Genkit flow to get ticket data.
 * - TicketExtractionInput - The input type for the flow.
 * - TicketExtractionOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access', 'Other'] as const;

const TicketExtractionInputSchema = z.object({
  userDescription: z.string().describe('The user\'s description of their IT problem.'),
});
export type TicketExtractionInput = z.infer<typeof TicketExtractionInputSchema>;

const TicketExtractionOutputSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the support ticket, summarizing the issue.'),
  issueType: z.enum(issueTypes).describe('The category of the issue. This MUST be one of the provided options: ' + issueTypes.join(', ') + '.'),
  customIssueType: z.string().optional().describe("If the issueType is 'Other', provide a brief custom type. Otherwise, this should be empty."),
  description: z.string().describe('A detailed description of the issue, based on the user\'s input. This should be the same as the user\'s original description.'),
});
export type TicketExtractionOutput = z.infer<typeof TicketExtractionOutputSchema>;

export async function extractTicketInfo(input: TicketExtractionInput): Promise<TicketExtractionOutput> {
  return createTicketAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTicketAIPrompt',
  model: 'gemini-1.5-flash-latest',
  input: {schema: TicketExtractionInputSchema},
  output: {schema: TicketExtractionOutputSchema},
  prompt: `You are an expert IT support assistant. Your task is to analyze a user's description of a problem and convert it into a structured support ticket.

You must categorize the issue into one of the following types: ${issueTypes.join(', ')}.
- If the issue doesn't fit any category, use 'Other' and specify a custom type in the 'customIssueType' field.
- The 'title' should be a short summary of the problem.
- The 'description' field should be the user's original, unmodified description.

User's problem description:
"{{{userDescription}}}"

Now, create the structured ticket.`,
});

const createTicketAIFlow = ai.defineFlow(
  {
    name: 'createTicketAIFlow',
    inputSchema: TicketExtractionInputSchema,
    outputSchema: TicketExtractionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
