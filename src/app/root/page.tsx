'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, BarChart, Settings, Megaphone } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const baseNavItems = [
  {
    href: '/root/tickets',
    icon: Ticket,
    title: 'All Tickets',
    description: 'View, manage, and filter all support tickets.',
  },
  {
    href: '/root/reports',
    icon: BarChart,
    title: 'Reports',
    description: 'Analyze ticket data with charts and statistics.',
  },
  {
    href: '/root/announcements',
    icon: Megaphone,
    title: 'Announcements',
    description: 'Send broadcast messages to users and staff.',
  },
];

const userManagementNavItem = {
    href: '/root/settings',
    icon: Settings,
    title: 'User Management',
    description: 'Manage user accounts and roles.',
};

const rootNavItem = {
    href: '/root/settings',
    icon: Settings,
    title: 'Root Settings',
    description: 'Manage user accounts and system settings.',
};

type UserProfile = {
  role?: string;
};

export default function RootDashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  const userIsAdmin = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
  const userIsSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);
  
  const loading = userLoading || profileLoading;

  if (loading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Image src="/logo.png" alt="Loading..." width={60} height={60} className="animate-spin" />
        </div>
      );
  }

  const navItems = [...baseNavItems];
  if (userIsRoot) {
    navItems.push(rootNavItem);
  } else if (userIsAdmin || userIsSupport) {
      navItems.push(userManagementNavItem);
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
