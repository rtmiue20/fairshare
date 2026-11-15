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

export interface EvidenceItemDto {
  sourceType: 'BOARD' | 'MANUAL' | string;
  sourceId: number;
  taskName: string;
  storyPoints?: number;
  earnedScore?: number;
  eventTime: string;
  status: string;
}

export interface ManualContributionRequest {
  taskName: string;
  evidenceLink: string;
  storyPoints: number;
}

export interface ManualContributionItem {
  id: number;
  teamId: number;
  sprintId?: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  taskName: string;
  evidenceLink: string;
  storyPoints: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reviewerId?: number;
  reviewerName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NetworkNodeDto {
  id: string;
  label: string;
  type: 'ROOT' | 'DIMENSION' | 'CATEGORY' | 'EVENT' | 'IMPEDIMENT';
  category: string;
  weight: number;
  badge?: string;
  status?: string;
  color?: string;
  description?: string;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface NetworkLinkDto {
  source: string;
  target: string;
  weight: number;
  type: string;
  color?: string;
  animated?: boolean;
}

export interface TierBreakdownDto {
  rawFeatures: Record<string, any>;
  logFeatures: Record<string, number>;
  robustZScores: Record<string, number>;
  dimensions: Record<string, number>;
  availabilityFactor: number;
  availabilityBonusFactor: number;
  adjustedDimensions: Record<string, number>;
  compositeScore: number;
  finalPercentage: number;
}

export interface SprintTimelineDto {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  status: string;
}

export interface MultidimensionalNetworkDto {
  teamId: number;
  sprintId: number;
  sprintName: string;
  focusedUserId: number;
  focusedUserName: string;
  finalPct: number;
  score: number;
  d1Output: number;
  d2Reliability: number;
  d3Collaboration: number;
  d4Peer: number;
  compositeScore: number;
  availabilityFactor: number;
  confidenceIntervalLow?: number;
  confidenceIntervalHigh?: number;
  distanceToCenter: number;
  isSuspicious: boolean;
  hasSufficientEvidence: boolean;
  totalEventsCount: number;
  tierBreakdown: TierBreakdownDto;
  nodes: NetworkNodeDto[];
  links: NetworkLinkDto[];
  sprints: SprintTimelineDto[];
}

export interface ImpactEventPayload {
  teamId: number;
  sprintId?: number;
  userId: number;
  title: string;
  description?: string;
  category: 'IMPEDIMENT' | 'HEALTH_AVAILABILITY' | 'REWORK_REASON' | 'EXTERNAL_BLOCKER' | 'COLLAB_SUPPORT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  delayDays?: number;
  difficultyLevel?: number;
  storyPoints?: number;
  updatedAvailabilityFactor?: number;
}

export interface UpdateAvailabilityPayload {
  sprintId: number;
  userId: number;
  availabilityFactor: number;
  reason?: string;
}

export interface ResolveSuspicionPayload {
  sprintId: number;
  userId: number;
  isSuspicious: boolean;
  note?: string;
}


