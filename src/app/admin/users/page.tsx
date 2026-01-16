'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreateBranchUserForm from '@/components/create-branch-user-form';
import UserList from '@/components/user-list';

export default function AdminUsersPage() {
  return (
    <>
        <div className="flex items-center justify-between space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline">
                User Management
            </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
                <UserList />
            </div>
            <div className="lg:col-span-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Create User</CardTitle>
                        <CardDescription>Create a new user and assign a role.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CreateBranchUserForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    </>
  );
}
