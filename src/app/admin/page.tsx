'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, BarChart, Settings, Loader2, Megaphone } from 'lucide-react';
import { useUser } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { useMemo } from 'react';

const baseNavItems = [
  {
    href: '/admin/tickets',
    icon: Ticket,
    title: 'All Tickets',
    description: 'View, manage, and filter all support tickets.',
  },
  {
    href: '/admin/reports',
    icon: BarChart,
    title: 'Reports',
    description: 'Analyze ticket data with charts and statistics.',
  },
  {
    href: '/admin/announcements',
    icon: Megaphone,
    title: 'Announcements',
    description: 'Send broadcast messages to users and staff.',
  },
];

const rootNavItem = {
    href: '/admin/settings',
    icon: Settings,
    title: 'Root Settings',
    description: 'Manage user accounts and roles.',
};

export default function AdminDashboardPage() {
  const { user, loading } = useUser();
  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  
  if (loading) {
      return <div className="flex h-32 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const navItems = userIsRoot ? [...baseNavItems, rootNavItem] : baseNavItems;

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Cheezious IT Support
        </h1>
      </div>
      <div className="grid gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} className="group">
            <Card className="h-full transition-all group-hover:border-primary group-hover:shadow-lg hover:-translate-y-1 duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold font-headline">{item.title}</CardTitle>
                <item.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
