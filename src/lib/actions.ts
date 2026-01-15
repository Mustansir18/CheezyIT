'use server';

import { summarizeTickets, type SummarizeTicketsInput } from '@/ai/flows/summarize-tickets';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access'] as const;

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  issueType: z.enum(issueTypes),
  description: z.string().min(1, 'Description is required.'),
  anydesk: z.string().optional(),
});

export async function createTicketAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = ticketSchema.safeParse({
      title: formData.get('title'),
      issueType: formData.get('issueType'),
      description: formData.get('description'),
      anydesk: formData.get('anydesk'),
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

const branchUserSchema = z.object({
  displayName: z.string().min(1, 'Display Name is required.'),
  email: z.string().email('Invalid email address.'),
  branchName: z.string().min(1, 'Branch Name is required.'),
});

// This is a placeholder. In a real app, you'd call Firebase Auth Admin SDK
// to create a user and then create a user profile in Firestore.
async function createBranchUserInDatabase(userData: z.infer<typeof branchUserSchema>) {
    console.log('Creating branch user:', userData);
    // 1. Call Firebase Auth to create a user (requires Admin SDK on a server)
    //    const userRecord = await auth.createUser({ email, password });
    // 2. Create a user profile document in Firestore
    //    await firestore.collection('users').doc(userRecord.uid).set({ ... });
    return { success: true, message: `User ${userData.displayName} created.` };
}

export async function createBranchUserAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = branchUserSchema.safeParse({
      displayName: formData.get('displayName'),
      email: formData.get('email'),
      branchName: formData.get('branchName'),
    });

    if (!validatedFields.success) {
      return {
        type: 'error',
        message: 'Invalid form data. Please check the fields.',
      };
    }

    // IMPORTANT: This is a simulation.
    // Creating users requires the Firebase Admin SDK, which must run in a
    // secure server environment, not in a Server Action directly exposed to the client.
    // I am logging to the console to simulate the user creation.
    const result = await createBranchUserInDatabase(validatedFields.data);

    if (result.success) {
      revalidatePath('/admin');
      return {
        type: 'success',
        message: result.message,
      };
    } else {
       return {
        type: 'error',
        message: 'Failed to create user.',
      };
    }

  } catch (e) {
    console.error(e);
    return {
      type: 'error',
      message: 'An unexpected error occurred.',
    };
  }
}
