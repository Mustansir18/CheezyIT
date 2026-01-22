'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket, BarChart, Settings, Megaphone } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { isRoot } from '@/lib/admins';
import { useMemo, useEffect, useRef } from 'react';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const hasRedirected = useRef(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const userIsRoot = useMemo(() => user && isRoot(user.email), [user]);
  const userIsAdmin = useMemo(() => userProfile?.role === 'Admin', [userProfile]);
  const userIsSupport = useMemo(() => userProfile?.role === 'it-support', [userProfile]);
  
  const loading = userLoading || profileLoading;
  
  useEffect(() => {
    if (!loading && !hasRedirected.current) {
        if (userIsSupport) {
            hasRedirected.current = true;
            router.replace('/admin/tickets');
        } else if (!userIsRoot && !userIsAdmin) {
            // This is a safeguard. The layout should prevent non-privileged users,
            // but if they get here, redirect them.
            hasRedirected.current = true;
            router.replace('/dashboard');
        }
    }
  }, [loading, userIsSupport, userIsRoot, userIsAdmin, router]);

  const navItems = useMemo(() => {
    let items = [...baseNavItems];
    if (userIsRoot) {
      items.push(rootNavItem);
    }
    return items;
  }, [userIsRoot]);

  // This loading state now also acts as a guard, preventing the page from rendering
  // until the redirect logic in useEffect has had a chance to run.
  if (loading || userIsSupport || (!userIsRoot && !userIsAdmin)) {
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
