// This file contains the list of user emails that have root privileges.
// You can add more emails to this array to grant root access to other users.

export const ROOT_EMAILS: string[] = [
];

export const isRoot = (email: string | undefined | null): boolean => {
    if (!email) return false;
    return ROOT_EMAILS.includes(email);
}
