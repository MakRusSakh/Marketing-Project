import { KPICards } from "@/components/dashboard/kpi-cards";
import { QueuePreview } from "@/components/dashboard/queue-preview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  FileText,
  CheckCircle,
  Calendar,
  FileEdit,
} from "lucide-react";
import type { KPIMetric } from "@/components/dashboard/kpi-cards";
import type { QueuedPost } from "@/components/dashboard/queue-preview";
import type { ActivityEvent } from "@/components/dashboard/recent-activity";

// Mock data - In production, this would come from your API/database
const mockMetrics: KPIMetric[] = [
  {
    title: "Total Content",
    value: 142,
    trend: "up",
    trendValue: "+12%",
    icon: FileText,
  },
  {
    title: "Published",
    value: 89,
    trend: "up",
    trendValue: "+8%",
    icon: CheckCircle,
  },
  {
    title: "Scheduled",
    value: 23,
    trend: "down",
    trendValue: "-3%",
    icon: Calendar,
  },
  {
    title: "Drafts",
    value: 30,
    trend: "neutral",
    trendValue: "No change",
    icon: FileEdit,
  },
];

const mockQueuedPosts: QueuedPost[] = [
  {
    id: "1",
    platform: "twitter",
    contentPreview: "Excited to announce our new feature launch! 🚀 Check out what's new...",
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    contentType: "thread",
  },
  {
    id: "2",
    platform: "linkedin",
    contentPreview: "5 ways to improve your content marketing strategy in 2025",
    scheduledAt: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
    contentType: "post",
  },
  {
    id: "3",
    platform: "facebook",
    contentPreview: "Join us for an exclusive webinar on digital marketing trends",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    contentType: "post",
  },
  {
    id: "4",
    platform: "instagram",
    contentPreview: "Behind the scenes: Our team working on the next big thing",
    scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
    contentType: "story",
  },
  {
    id: "5",
    platform: "twitter",
    contentPreview: "Quick tip: Use these 3 strategies to boost engagement",
    scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days from now
    contentType: "post",
  },
];

const mockActivities: ActivityEvent[] = [
  {
    id: "1",
    type: "published",
    description: "Successfully published post to Twitter",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    platform: "twitter",
    contentType: "post",
  },
  {
    id: "2",
    type: "generated",
    description: "AI generated new content: 'Top 10 Marketing Trends'",
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    contentType: "article",
  },
  {
    id: "3",
    type: "scheduled",
    description: "Scheduled LinkedIn post for tomorrow at 9 AM",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    platform: "linkedin",
    contentType: "post",
  },
  {
    id: "4",
    type: "published",
    description: "Successfully published Instagram story",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    platform: "instagram",
    contentType: "story",
  },
  {
    id: "5",
    type: "drafted",
    description: "Created new draft: 'Product Launch Announcement'",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    contentType: "post",
  },
  {
    id: "6",
    type: "scheduled",
    description: "Scheduled Facebook post for weekend",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    platform: "facebook",
    contentType: "post",
  },
  {
    id: "7",
    type: "published",
    description: "Published Twitter thread about our new features",
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000), // 1.5 days ago
    platform: "twitter",
    contentType: "thread",
  },
  {
    id: "8",
    type: "generated",
    description: "AI adapted content for multiple platforms",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    contentType: "multi-platform",
  },
];

// Server Component - This would fetch real data in production
export default async function DashboardPage() {
  // In production, you would fetch data here:
  // const metrics = await getMetrics();
  // const queuedPosts = await getQueuedPosts();
  // const activities = await getRecentActivities();
  // const products = await getProducts();

  return (
    <div className="space-y-8">
      {/* Welcome Section with Product Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Marketing Nexus
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your unified platform for content creation, publishing, and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="product-select" className="text-sm font-medium text-foreground">
            Product:
          </label>
          <select
            id="product-select"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue="all"
          >
            <option value="all">All Products</option>
            <option value="product-1">Product 1</option>
            <option value="product-2">Product 2</option>
            <option value="product-3">Product 3</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <KPICards metrics={mockMetrics} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Widget */}
          <QuickActions />

          {/* Queue Preview Widget */}
          <QueuePreview posts={mockQueuedPosts} />
        </div>

        {/* Right Column - 1/3 width on large screens */}
        <div className="lg:col-span-1">
          {/* Recent Activity Feed */}
          <RecentActivity events={mockActivities} maxEvents={8} />
        </div>
      </div>
    </div>
  );
}
