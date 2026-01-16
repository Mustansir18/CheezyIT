'use client';
import AdminAnalytics from '@/components/admin-analytics';

export default function AdminReportsPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Reports Dashboard
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
          <AdminAnalytics />
      </div>
    </>
  );
}
