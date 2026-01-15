// This file contains the list of user UIDs that have admin privileges.
// You can add more UIDs to this array to grant admin access to other users.

export const ADMIN_UIDS = [
  'MTuyKiLxruWCp3BtZI2NYAsfGdD2',
];

export const isAdmin = (uid: string | undefined): boolean => {
    if (!uid) return false;
    return ADMIN_UIDS.includes(uid);
}
