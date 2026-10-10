export type Role = 'LEADER' | 'MEMBER';

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export interface TeamMember {
  id: number;
  user: User;
  role: Role;
  hasConsented: boolean;
  joinedAt: string;
}

export interface Team {
  id: number;
  name: string;
  courseName?: string;
  description?: string;
  inviteCode?: string;
  members?: TeamMember[];
  createdAt: string;
}

export interface CreateTeamRequest {
  name: string;
  courseName?: string;
  description?: string;
}

export interface ConsentRequest {
  consented: boolean;
  shareTrelloActivity: boolean;
  shareDocsActivity: boolean;
}
