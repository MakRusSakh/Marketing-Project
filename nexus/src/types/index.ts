// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Content Types
export interface Content {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  status: ContentStatus;
  type: ContentType;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ContentType = "post" | "article" | "video" | "image";

// Publisher Types
export interface Publisher {
  id: string;
  workspaceId: string;
  platform: PublisherPlatform;
  accountName: string;
  isConnected: boolean;
  credentials?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PublisherPlatform = "twitter" | "linkedin" | "facebook" | "instagram" | "youtube";

// Campaign Types
export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

// Analytics Types
export interface Analytics {
  id: string;
  contentId: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagement: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
