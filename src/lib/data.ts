
export type TicketStatus = 'Pending' | 'In Progress' | 'Resolved';

export type Ticket = {
  userId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High';
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
        return { pending: 0, inProgress: 0, resolved: 0 };
    }
    return {
        pending: allTickets.filter(t => t.status === 'Pending').length,
        inProgress: allTickets.filter(t => t.status === 'In Progress').length,
        resolved: allTickets.filter(t => t.status === 'Resolved').length,
    };
};
