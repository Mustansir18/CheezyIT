'use client';
// This file contains the email for the admin user with super privileges.

export const ADMIN_EMAIL: string = process.env.NEXT_PUBLIC_ROOT_ADMIN_EMAIL || 'mustansir133@gmail.com';

export const isAdmin = (email: string | undefined | null): boolean => {
    if (!email) return false;
    // Make the check case-insensitive
    return ADMIN_EMAIL.toLowerCase() === email.toLowerCase();
}
