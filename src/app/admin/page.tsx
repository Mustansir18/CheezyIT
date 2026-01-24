'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, BarChart, Settings, Megaphone, History } from 'lucide-react';
import { isAdmin } from '@/lib/admins';
import { useMemo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const allNavItems = [
  {
    href: '/admin/tickets',
    icon: Ticket,
    title: 'All Tickets',
    description: 'View, manage, and filter all support tickets.',
    roles: ['Admin', 'it-support'],
  },
  {
    href: '/admin/reports',
    icon: BarChart,
    title: 'Reports',
    description: 'Analyze ticket data with charts and statistics.',
    roles: ['Admin'],
  },
  {
    href: '/admin/announcements',
    icon: Megaphone,
    title: 'Announcements',
    description: 'Send broadcast messages to users and staff.',
    roles: ['Admin'],
  },
  {
    href: '/admin/activity-log',
    icon: History,
    title: 'Activity Log',
    description: 'Track all actions and events in the app.',
    roles: ['Admin'],
  },
  {
    href: '/admin/settings',
    icon: Settings,
    title: 'Admin Settings',
    description: 'Manage user accounts and roles.',
    roles: ['Admin'],
  },
];

export default function AdminDashboardPage() {
  const [user, setUser] = useState<{email: string, role: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userJson = localStorage.getItem('mockUser');
    if (userJson) {
      setUser(JSON.parse(userJson));
    }
    setLoading(false);
  }, []);

  const navItems = useMemo(() => {
    if (!user?.role) return [];
    return allNavItems.filter(item => item.roles.includes(user.role));
  }, [user]);

  if (loading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {navItems.map((item) => (
        <Link href={item.href} key={item.href} className="group">
          <Card className="h-full shadow-md transition-all hover:shadow-xl hover:-translate-y-1 duration-200 group-hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold font-headline">{item.title}</CardTitle>
              <item.icon className="h-6 w-6 text-accent" />
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
  );
}
