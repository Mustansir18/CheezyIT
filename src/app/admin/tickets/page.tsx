'use client';
import AdminTicketList from '@/components/admin-ticket-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { isAdmin } from '@/lib/admins';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function AdminTicketsPage() {
    const [user, setUser] = useState<{email: string; role: string} | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userJson = localStorage.getItem('mockUser');
        if(userJson) {
            const parsed = JSON.parse(userJson);
             if (isAdmin(parsed.email)) parsed.role = 'Admin';
             else parsed.role = 'it-support';
            setUser(parsed);
        }
        setLoading(false);
    }, []);

  
  const userIsAdmin = useMemo(() => user && isAdmin(user.email), [user]);
  const userIsSupport = useMemo(() => user?.role === 'it-support', [user]);

  if (loading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-4">
            {!userIsSupport && (
                <Button asChild variant="outline" size="icon">
                    <Link href="/admin">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                    </Link>
                </Button>
            )}
            <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsAdmin && "text-primary")}>
                All Tickets
            </h1>
        </div>
        <AdminTicketList />
    </div>
  );
}
