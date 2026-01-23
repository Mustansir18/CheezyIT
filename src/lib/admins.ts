'use client';
// This file contains the list of user emails that have root privileges.
// You can add more emails to this array to grant root access to other users.

export const ROOT_EMAILS: string[] = [
    'mustansir133@gmail.com',
];

export const isRoot = (email: string | undefined | null): boolean => {
    if (!email) return false;
    // Make the check case-insensitive
    return ROOT_EMAILS.some(rootEmail => rootEmail.toLowerCase() === email.toLowerCase());
}
