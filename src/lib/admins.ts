// This file contains the list of user emails that have admin privileges.
// You can add more emails to this array to grant admin access to other users.

export const ADMIN_EMAILS = [
  'mustansir133@gmail.com',
];

export const isAdmin = (email: string | undefined | null): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
}
