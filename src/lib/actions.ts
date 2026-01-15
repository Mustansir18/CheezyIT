
'use server';

import { summarizeTickets, type SummarizeTicketsInput } from '@/ai/flows/summarize-tickets';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  priority: z.enum(['Low', 'Medium', 'High']),
});

export async function createTicketAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = ticketSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
    });

    if (!validatedFields.success) {
      return {
        type: 'error',
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Ticket.',
      };
    }
    
    // In a real app, you would save the data to a database here.
    console.log('New ticket created:', validatedFields.data);

    revalidatePath('/dashboard');

    return {
      type: 'success',
      message: 'Ticket created successfully!',
    };
  } catch (e) {
    return {
      type: 'error',
      message: 'Database Error: Failed to Create Ticket.',
    };
  }
}

export async function summarizeTicketsAction(tickets: SummarizeTicketsInput['tickets']) {
  if (!tickets || tickets.length === 0) {
    return { summary: 'There are no open tickets to summarize at the moment.' };
  }
  try {
    const result = await summarizeTickets({ tickets });
    return result;
  } catch (error) {
    console.error('AI Summary Error:', error);
    return { error: 'We had trouble generating a summary. Please try again.' };
  }
}
