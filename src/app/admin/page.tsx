'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, BarChart, Settings, Megaphone } from 'lucide-react';
import { isAdmin } from '@/lib/admins';
import { useMemo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

const adminNavItem = {
    href: '/admin/settings',
    icon: Settings,
    title: 'Admin Settings',
    description: 'Manage user accounts and roles.',
};

export default function AdminDashboardPage() {
  const [user, setUser] = useState<{email: string, role: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userJson = localStorage.getItem('mockUser');
    if (userJson) {
      const parsed = JSON.parse(userJson);
      if (isAdmin(parsed.email)) {
        parsed.role = 'Admin';
      } else {
        parsed.role = 'it-support';
      }
      setUser(parsed);
    }
    setLoading(false);
  }, []);

  const userIsAdmin = useMemo(() => user && isAdmin(user.email), [user]);
  const userIsSupport = useMemo(() => user?.role === 'it-support', [user]);
  
  useEffect(() => {
    if (!loading && userIsSupport) {
        router.replace('/admin/tickets');
    }
  }, [loading, userIsSupport, router]);

  if (loading || userIsSupport) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
  }

  const navItems = [...baseNavItems];
  if (userIsAdmin) {
    navItems.push(adminNavItem);
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
