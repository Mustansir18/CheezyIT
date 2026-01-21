

export type TicketStatus = 'Open' | 'In-Progress' | 'Resolved' | 'Closed';

export const TICKET_STATUS_LIST: TicketStatus[] = ['Open', 'In-Progress', 'Resolved', 'Closed'];

export type Ticket = {
  userId: string;
  ticketId: string;
  title: string;
  description: string;
  status: TicketStatus;
  assignedTo?: string;
  assignedToDisplayName?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  completedAt?: any; // Firestore Timestamp
  resolvedBy?: string;
  resolvedByDisplayName?: string;
  issueType: string;
  customIssueType?: string;
  anydesk?: string;
  unreadByAdmin?: boolean;
  unreadByUser?: boolean;
  region: string;
};

export type ChatMessage = {
  userId: string;
  displayName: string;
  text?: string;
  audioUrl?: string;
  link?: string;
  type?: 'user' | 'call_request';
  createdAt: any; // Firestore Timestamp
  isRead?: boolean;
};


export const getStats = (allTickets: (Ticket & { id: string })[]) => {
    if (!allTickets) {
        return { open: 0, inProgress: 0, resolved: 0, closed: 0 };
    }
    return {
        open: allTickets.filter(t => t.status === 'Open').length,
        inProgress: allTickets.filter(t => t.status === 'In-Progress').length,
        resolved: allTickets.filter(t => t.status === 'Resolved').length,
        closed: allTickets.filter(t => t.status === 'Closed').length,
    };
};

    
