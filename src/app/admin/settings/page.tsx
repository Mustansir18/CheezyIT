'use client';
import UserManagement from '@/components/user-management';

export default function AdminSettingsPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          User Management
        </h1>
      </div>
      <div className="mt-4">
        <UserManagement />
      </div>
    </>
  );
}
