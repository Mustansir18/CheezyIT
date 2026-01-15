
import { useState, useEffect } from 'react';

export type TicketStatus = 'Pending' | 'In Progress' | 'Resolved';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
};

const initialTickets: Ticket[] = [
  {
    id: 'TKT-001',
    title: 'Cannot connect to company VPN',
    description: 'My VPN client keeps failing to connect from my home network. I have tried restarting my computer and the router.',
    status: 'In Progress',
    priority: 'High',
    createdAt: '2024-05-20',
  },
  {
    id: 'TKT-002',
    title: 'Printer on 3rd floor is out of toner',
    description: 'The HP LaserJet 3055 is reporting a "low toner" error and will not print.',
    status: 'Resolved',
    priority: 'Medium',
    createdAt: '2024-05-18',
  },
  {
    id: 'TKT-003',
    title: 'Request for new software installation',
    description: 'I need Adobe Photoshop installed on my workstation for a new project.',
    status: 'Pending',
    priority: 'Medium',
    createdAt: '2024-05-21',
  },
  {
    id: 'TKT-004',
    title: 'Email client crashing on startup',
    description: 'Outlook is crashing every time I open it. I have already tried running it in safe mode.',
    status: 'In Progress',
    priority: 'High',
    createdAt: '2024-05-21',
  },
  {
    id: 'TKT-005',
    title: 'Forgotten password for internal portal',
    description: 'I am unable to log in to the employee portal and need my password reset.',
    status: 'Resolved',
    priority: 'Low',
    createdAt: '2024-05-19',
  },
  {
    id: 'TKT-006',
    title: 'Monitor screen is flickering',
    description: 'My secondary Dell monitor has started flickering intermittently. It happens every few minutes.',
    status: 'Pending',
    priority: 'Medium',
    createdAt: '2024-05-22',
  },
];

// Simulate an async API call to get tickets, we'll replace this with Firestore later.
export const getTickets = async (): Promise<Ticket[]> => {
    // In a real app, you'd use a hook like useCollection here.
    // For now, we return mock data.
    return new Promise(resolve => setTimeout(() => resolve(initialTickets), 500));
};

export const useMockTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      const result = await getTickets();
      setTickets(result);
      setLoading(false);
    };
    fetchTickets();
  }, []);

  return { tickets, loading };
}


export const getStats = (allTickets: Ticket[]) => {
    if (!allTickets) {
        return { pending: 0, inProgress: 0, resolved: 0 };
    }
    return {
        pending: allTickets.filter(t => t.status === 'Pending').length,
        inProgress: allTickets.filter(t => t.status === 'In Progress').length,
        resolved: allTickets.filter(t => t.status === 'Resolved').length,
    };
};
