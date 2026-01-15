export type TicketStatus = 'Pending' | 'In Progress' | 'Resolved';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
};

export type MockUser = {
  name: string;
  email: string;
  initials: string;
};

const tickets: Ticket[] = [
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

const mockUser: MockUser = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  initials: 'JD',
};

// Simulate an async API call
export const getTickets = async (): Promise<Ticket[]> => {
  return new Promise(resolve => setTimeout(() => resolve(tickets), 500));
};

export const getMockUser = async (): Promise<MockUser> => {
    return new Promise(resolve => setTimeout(() => resolve(mockUser), 200));
}

export const getStats = async (allTickets: Ticket[]) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        pending: allTickets.filter(t => t.status === 'Pending').length,
        inProgress: allTickets.filter(t => t.status === 'In Progress').length,
        resolved: allTickets.filter(t => t.status === 'Resolved').length,
      });
    }, 300);
  });
};
