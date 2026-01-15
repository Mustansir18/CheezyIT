
'use server';

import { summarizeTickets, type SummarizeTicketsInput } from '@/ai/flows/summarize-tickets';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access', 'Other'] as const;

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  issueType: z.enum(issueTypes),
  customIssueType: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  anydesk: z.string().optional(),
  photo: z.string().optional(),
}).refine(data => {
    if (data.issueType === 'Other') {
        return !!data.customIssueType && data.customIssueType.length > 0;
    }
    return true;
}, {
    message: 'Please specify your issue type.',
    path: ['customIssueType'],
});


export async function createTicketAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = ticketSchema.safeParse({
      title: formData.get('title'),
      issueType: formData.get('issueType'),
      customIssueType: formData.get('customIssueType'),
      description: formData.get('description'),
      anydesk: formData.get('anydesk'),
      photo: formData.get('photo'),
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
    if (validatedFields.data.photo) {
      console.log('Photo included, size:', validatedFields.data.photo.length);
    }


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

const userSchema = z.object({
  displayName: z.string().min(1, 'Display Name is required.'),
  email: z.string().email('Invalid email address.'),
  role: z.enum(['user', 'branch', 'admin', 'it-support']),
  branchName: z.string().optional().nullable(),
}).refine(data => {
    if (data.role === 'branch') {
        return !!data.branchName && data.branchName.length > 0;
    }
    return true;
}, {
    message: 'Branch Name is required for Branch Users.',
    path: ['branchName'],
});


// This is a placeholder. In a real app, you'd call Firebase Auth Admin SDK
// to create a user and then create a user profile in Firestore.
async function createUserInDatabase(userData: z.infer<typeof userSchema>) {
    console.log('Creating user in database (simulation):', userData);
    // NOTE: This simulation does NOT create a user in Firebase Authentication.
    // An admin would need to set an initial password through the Firebase Console
    // or you would need a more complex user invitation flow.
    
    // 1. In a real app, you would use the Admin SDK to create the Auth user.
    //    const userRecord = await getAuth().createUser({ email: userData.email, displayName: userData.displayName });
    //    const uid = userRecord.uid;
    
    // 2. Then, you'd create the user profile document in Firestore.
    //    await getFirestore().collection('users').doc(uid).set({
    //       id: uid,
    //       email: userData.email,
    //       displayName: userData.displayName,
    //       role: userData.role,
    //       ...(userData.branchName && { branchName: userData.branchName }),
    //    });

    return { success: true, message: `User profile for ${userData.displayName} created in Firestore.` };
}

export async function createBranchUserAction(prevState: any, formData: FormData) {
  try {
    const data = {
      displayName: formData.get('displayName'),
      email: formData.get('email'),
      role: formData.get('role'),
      branchName: formData.get('branchName'),
    };
    
    const validatedFields = userSchema.safeParse(data);

    if (!validatedFields.success) {
      // Get the first error message to display to the user
      const firstError = validatedFields.error.errors[0]?.message;
      return {
        type: 'error',
        message: firstError || 'Invalid form data. Please check the fields.',
      };
    }

    // IMPORTANT: This is a simulation.
    // Creating users requires the Firebase Admin SDK, which must run in a
    // secure server environment, not in a Server Action directly exposed to the client.
    // I am logging to the console to simulate the user creation.
    const result = await createUserInDatabase(validatedFields.data);

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
