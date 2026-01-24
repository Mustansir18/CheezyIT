'use client';

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { type Firestore } from "firebase/firestore";

type LogData = {
    userId: string;
    userName: string;
    action: string;
    details: string;
};

export const logActivity = (firestore: Firestore, data: LogData) => {
    if (!firestore) {
        console.error("Firestore instance not available for logging activity.");
        return;
    }
    
    addDoc(collection(firestore, 'activityLogs'), {
        ...data,
        timestamp: serverTimestamp(),
    }).catch(error => {
        console.error("Failed to log activity:", error);
    });
};
