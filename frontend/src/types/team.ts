export type Role = 'LEADER' | 'MEMBER';

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  studentId?: string | null;
  phone?: string | null;
  major?: string | null;
  teamRole?: string | null;
  bio?: string | null;
  githubUsername?: string | null;
  createdAt?: string;
}

export interface TeamMember {
  id: number;
  userId?: number;
  email?: string;
  fullName?: string;
  user?: User;
  role: Role;
  hasConsented: boolean;
  joinedAt: string;
}

export interface Team {
  id: number;
  name: string;
  currentRole?: Role;
  courseName?: string;
  description?: string;
  inviteCode?: string;
  lecturer?: string | null;
  sprintCount?: number | null;
  members?: TeamMember[];
  createdAt: string;
}

export interface CreateTeamRequest {
  name: string;
  courseName?: string;
  description?: string;
  lecturer?: string;
  sprintCount?: number;
}

export interface ConsentRequest {
  consented: boolean;
  shareTrelloActivity: boolean;
  shareDocsActivity: boolean;
}
