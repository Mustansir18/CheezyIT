
'use server';

import { summarizeTickets, type SummarizeTicketsInput } from '@/ai/flows/summarize-tickets';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getFirestore, collection, query, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


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


export async function sendAnnouncementAction(data: {
  title: string;
  message: string;
  targetRoles: string[];
  targetRegions: string[];
}) {
  'use server';
  try {
    const { firestore } = initializeFirebase();
    const usersRef = collection(firestore, 'users');
    const usersQuery = query(usersRef);
    const usersSnapshot = await getDocs(usersQuery);

    const allUsers: any[] = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const targetUsers = allUsers.filter(user => {
      if (data.targetRoles.length === 0 && data.targetRegions.length === 0) {
        return true; // Target all users if no roles or regions are specified
      }

      const roleMatch = data.targetRoles.length === 0 || data.targetRoles.includes(user.role);
      
      const userRegions = user.regions || (user.region ? [user.region] : []);
      const regionMatch = data.targetRegions.length === 0 || userRegions.some((r: string) => data.targetRegions.includes(r));
      
      if (data.targetRoles.length > 0 && data.targetRegions.length > 0) {
        return roleMatch && regionMatch;
      }
      return roleMatch || regionMatch;
    });

    if (targetUsers.length === 0) {
      return { error: 'No users found matching the selected criteria.' };
    }

    const batch = writeBatch(firestore);
    const notificationData = {
      title: data.title,
      message: data.message,
      createdAt: serverTimestamp(),
      isRead: false,
    };

    targetUsers.forEach(user => {
      const notificationRef = doc(collection(firestore, 'users', user.id, 'notifications'));
      batch.set(notificationRef, notificationData);
    });

    await batch.commit();
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    return { success: `Announcement sent to ${targetUsers.length} users.` };

  } catch (e: any) {
    console.error("Error sending announcement:", e);
    return { error: 'Failed to send announcement. You may not have the required permissions.' };
  }
}
