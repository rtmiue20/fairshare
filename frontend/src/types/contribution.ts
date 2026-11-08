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
  // Multi-dimensional 4-tier model fields
  d1Output?: number;
  d2Reliability?: number;
  d3Collaboration?: number;
  d4Peer?: number;
  finalPct?: number;
  isEnoughEvidence?: boolean;
  hasSufficientEvidence?: boolean;
  suspicionFlag?: boolean;
  isSuspicious?: boolean;
  confidenceIntervalLow?: number;
  confidenceIntervalHigh?: number;
}

export interface ContributionSummaryItem {
  userId: number;
  userName: string;
  trelloScore?: number;
  manualScore?: number;
  activityPct?: number;
  peerPct?: number;
  finalPct: number;
  d1Output?: number;
  d2Reliability?: number;
  d3Collaboration?: number;
  d4Peer?: number;
  compositeScore?: number;
  availabilityFactor?: number;
  confidenceIntervalLow?: number;
  confidenceIntervalHigh?: number;
  distanceToCenter?: number;
  isSuspicious?: boolean;
  suspicionFlag?: boolean;
  hasSufficientEvidence?: boolean;
  isEnoughEvidence?: boolean;
  evidenceStatus?: string;
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
