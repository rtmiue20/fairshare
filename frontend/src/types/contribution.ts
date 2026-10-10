export interface ContributionScore {
  userId: number;
  userName: string;
  avatarUrl?: string;
  percentage: number;
  taskCompletedCount: number;
  docsEditCount: number;
  manualScore: number;
  totalScore: number;
  peerReviewScore?: number;
}

export interface ContributionSummary {
  teamId: number;
  sprintId?: number;
  scores: ContributionScore[];
  updatedAt: string;
}

export interface EvidenceItem {
  id: number;
  userId: number;
  source: 'TRELLO' | 'GOOGLE_DOCS' | 'MANUAL';
  activityType: string;
  title: string;
  description?: string;
  externalUrl?: string;
  timestamp: string;
  weight: number;
}
