'use client';
import AdminAnalytics from '@/components/admin-analytics';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function AdminReportsPage() {
  const { user } = useUser();
  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
        <h1 className={cn("text-3xl font-bold tracking-tight font-headline", userIsRoot && "text-primary")}>
          Reports Dashboard
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
          <AdminAnalytics />
      </div>
    </div>
  );
}
