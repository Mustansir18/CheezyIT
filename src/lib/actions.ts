
'use server';

import { chatBot } from '@/ai/flows/chatbot';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getFirestore, collection, query, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


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


export async function sendAnnouncementAction(data: {
  title: string;
  message: string;
  targetRoles: string[];
  targetRegions: string[];
  targetUsers: string[];
}) {
  'use server';
  try {
    const { firestore } = initializeFirebase();
    const usersRef = collection(firestore, 'users');
    const usersQuery = query(usersRef);
    const usersSnapshot = await getDocs(usersQuery);

    const allUsers: any[] = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    let targetUsers: any[] = [];
    
    // Priority 1: Target specific user IDs if provided
    if (data.targetUsers && data.targetUsers.length > 0) {
        targetUsers = allUsers.filter(user => data.targetUsers.includes(user.id));
    } else {
        // Priority 2: Progressively filter by roles and regions with AND logic.
        let filteredUsers = allUsers;

        // Filter by roles if any are selected
        if (data.targetRoles.length > 0) {
            filteredUsers = filteredUsers.filter(user => user.role && data.targetRoles.includes(user.role));
        }

        // Further filter by regions if any are selected
        if (data.targetRegions.length > 0) {
            filteredUsers = filteredUsers.filter(user => {
                const userRegions = (Array.isArray(user.regions) && user.regions.length > 0)
                    ? user.regions
                    : (user.region ? [user.region] : []);
                return userRegions.some((r: string) => data.targetRegions.includes(r));
            });
        }
        
        targetUsers = filteredUsers;
    }

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
    return { success: `Announcement sent to ${targetUsers.length} user(s).` };

  } catch (e: any) {
    console.error("Error sending announcement:", e);
    return { error: 'Failed to send announcement. You may not have the required permissions.' };
  }
}
