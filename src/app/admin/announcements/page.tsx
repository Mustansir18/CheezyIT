
'use client';
import AnnouncementForm from '@/components/announcement-form';
import AnnouncementHistory from '@/components/announcement-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminAnnouncementsPage() {
  return (
    <Tabs defaultValue="send" className="w-full">
      <div className="flex items-center justify-between space-y-2">
         <h1 className="text-3xl font-bold tracking-tight font-headline">
          Announcements
        </h1>
        <TabsList>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="send" className="mt-4">
        <AnnouncementForm />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <AnnouncementHistory />
      </TabsContent>
    </Tabs>
  );
}
