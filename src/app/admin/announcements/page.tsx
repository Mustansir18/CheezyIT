
'use client';
import AnnouncementForm from '@/components/announcement-form';

export default function AdminAnnouncementsPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Send an Announcement
        </h1>
      </div>
      <div className="mt-4">
        <AnnouncementForm />
      </div>
    </>
  );
}
