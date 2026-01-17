'use client';
import AdminTicketList from '@/components/admin-ticket-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminTicketsPage() {
  return (
    <div className="space-y-4">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/admin">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Dashboard</span>
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">
                All Tickets
            </h1>
        </div>
        <AdminTicketList />
    </div>
  );
}
