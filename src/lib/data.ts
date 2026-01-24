export type TicketStatus = 'Open' | 'In-Progress' | 'Resolved' | 'Closed';

export const TICKET_STATUS_LIST: TicketStatus[] = ['Open', 'In-Progress', 'Resolved', 'Closed'];

export type Ticket = {
  id?: string;
  userId: string;
  ticketId: string;
  title: string;
  description: string;
  status: TicketStatus;
  assignedTo?: string;
  assignedToDisplayName?: string;
  createdAt: any; // Storing as Date object in state, but string in JSON
  updatedAt: any; // Storing as Date object in state, but string in JSON
  completedAt?: any; 
  resolvedBy?: string;
  resolvedByDisplayName?: string;
  issueType: string;
  customIssueType?: string;
  anydesk?: string;
  unreadByAdmin?: boolean;
  unreadByUser?: boolean;
};

export type ChatMessage = {
  id?: string;
  userId: string;
  displayName: string;
  text?: string;
  audioUrl?: string;
  link?: string;
  type?: 'user' | 'call_request';
  createdAt: any; // Firestore Timestamp
  isRead?: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  targetRoles: string[];
  targetUsers: string[];
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  sentBy: string;
  readBy: string[];
};

export const initialMockTickets: (Ticket & { id: string })[] = [
    { id: 'TKT-001', ticketId: 'TKT-001', userId: 'user@example.com', title: 'Wifi not working', status: 'Open', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedAt: new Date(), description: 'The wifi in the main conference room is down.' },
    { id: 'TKT-002', ticketId: 'TKT-002', userId: 'head@example.com', title: 'Printer jam', status: 'In-Progress', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedAt: new Date(), description: 'The 2nd floor printer is jammed and showing an error code.' },
    { id: 'TKT-003', ticketId: 'TKT-003', userId: 'user@example.com', title: 'Software install request', status: 'Resolved', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), updatedAt: new Date(), description: 'I need Adobe Photoshop installed on my new laptop.' },
    { id: 'TKT-004', ticketId: 'TKT-004', userId: 'user@example.com', title: 'Password reset', status: 'Closed', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), updatedAt: new Date(), description: 'I forgot my password for the sales portal.' },
    { id: 'TKT-005', ticketId: 'TKT-005', userId: 'head@example.com', title: 'Monitor is flickering', status: 'Closed', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), updatedAt: new Date(), description: 'My external monitor keeps flickering on and off.' },
    { id: 'TKT-006', ticketId: 'TKT-006', userId: 'support@example.com', title: 'VPN connection issue', status: 'Open', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), updatedAt: new Date(), description: 'I cannot connect to the VPN from home.' },
];


export const getStats = (allTickets: (Ticket & { id: string })[]) => {
    if (!allTickets) {
        return { open: 0, inprogress: 0, resolved: 0, closed: 0 };
    }
    return {
        open: allTickets.filter(t => t.status === 'Open').length,
        inprogress: allTickets.filter(t => t.status === 'In-Progress').length,
        resolved: allTickets.filter(t => t.status === 'Resolved').length,
        closed: allTickets.filter(t => t.status === 'Closed').length,
    };
};
