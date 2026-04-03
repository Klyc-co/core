import type {
  Platform,
  ContentType,
  CampaignObjective,
  CampaignStatus,
} from '../models/types'

export type SubmindType = 'research' | 'product' | 'narrative' | 'social' | 'image' | 'editor' | 'approval' | 'analytics'
export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' | 'archived'

export interface Campaign {
  id: string
  name: string
  objective: CampaignObjective
  platforms: Platform[]
  contentTypes: ContentType[]
  postFrequency: number
  duration: number
  status: CampaignStatus
  keywords: string[]
  audienceTargeting?: string
  createdAt: number
  updatedAt: number
  totalPosts?: number
  publishedPosts?: number
  avgEngagement?: number
}

export interface Content {
  id: string
  campaignId: string
  type: ContentType
  platform: Platform
  text?: string
  mediaUrl?: string
  sourceSubmind: SubmindType
  confidenceScore: number
  viralPatternMatch: number
  predictedEngagement: number
  status: ContentStatus
  createdAt: number
  approvedAt?: number
  publishedAt?: number
  rejectionReason?: string
}

export interface ResearchSignal {
  id: string
  source: 'reddit' | 'rss' | 'trends' | 'forum' | 'market'
  topic: string
  cluster: string
  opportunityScore: number
  trending: boolean
  relatedKeywords: string[]
  discoveredAt: number
}

export interface AnalyticsMetric {
  id: string
  contentId: string
  timestamp: number
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '2h'
  views: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
  viralVelocity: number
}
