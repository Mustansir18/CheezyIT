
export type TicketStatus = 'Pending' | 'In Progress' | 'Resolved';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High';
  createdAt: any; // Firestore Timestamp
  issueType: string;
  customIssueType?: string;
  anydesk?: string;
  attachments?: string[];
};

export type ChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  createdAt: any; // Firestore Timestamp
};


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
