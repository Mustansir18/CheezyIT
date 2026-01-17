'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, BarChart, Settings, Loader2, Megaphone } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';

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

type UserProfile = {
  role?: string;
};

export default function AdminDashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  
  const loading = userLoading || profileLoading;

  const dashboardTitle = useMemo(() => {
    if (!user) return '';
    if (userIsRoot) return 'Root Dashboard';
    
    switch (userProfile?.role) {
      case 'Admin':
        return 'Admin Dashboard';
      case 'it-support':
        return 'IT Support Dashboard';
      default:
        return `${user.displayName}'s Dashboard`;
    }
  }, [user, userIsRoot, userProfile]);
  
  if (loading) {
      return <div className="flex h-32 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const navItems = userIsRoot ? [...baseNavItems, rootNavItem] : baseNavItems;

  return (
    <>
      <div className="flex flex-col items-center justify-between space-y-2">
        <Image src="/background.png" alt="Dashboard Banner" width={1200} height={200} className="w-full h-auto rounded-lg" quality={100} />
        <h1 className="text-2xl font-bold tracking-tight pt-2 text-orange-500">{dashboardTitle}</h1>
      </div>
      <div className="grid gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} className="group">
            <Card className="h-full shadow-md transition-all hover:shadow-xl hover:-translate-y-1 duration-200 group-hover:border-primary">
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
