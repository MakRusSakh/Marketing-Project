// Force dynamic rendering - this page needs database access
export const dynamic = 'force-dynamic';

import { KPICards } from "@/components/dashboard/kpi-cards";
import { QueuePreview } from "@/components/dashboard/queue-preview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { prisma } from "@/lib/prisma";
import {
  FileText,
  CheckCircle,
  Calendar,
  FileEdit,
} from "lucide-react";
import type { KPIMetric } from "@/components/dashboard/kpi-cards";

// Fetch real metrics from database
async function getMetrics(): Promise<KPIMetric[]> {
  try {
    const [totalContent, published, scheduled, drafts] = await Promise.all([
      prisma.content.count(),
      prisma.publication.count({ where: { status: "published" } }),
      prisma.publication.count({ where: { status: "scheduled" } }),
      prisma.content.count({ where: { status: "draft" } }),
    ]);

    return [
      {
        title: "Всего контента",
        value: totalContent,
        trend: "neutral" as const,
        trendValue: "",
        icon: FileText,
      },
      {
        title: "Опубликовано",
        value: published,
        trend: "neutral" as const,
        trendValue: "",
        icon: CheckCircle,
      },
      {
        title: "Запланировано",
        value: scheduled,
        trend: "neutral" as const,
        trendValue: "",
        icon: Calendar,
      },
      {
        title: "Черновики",
        value: drafts,
        trend: "neutral" as const,
        trendValue: "",
        icon: FileEdit,
      },
    ];
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return [
      { title: "Всего контента", value: 0, trend: "neutral" as const, trendValue: "", icon: FileText },
      { title: "Опубликовано", value: 0, trend: "neutral" as const, trendValue: "", icon: CheckCircle },
      { title: "Запланировано", value: 0, trend: "neutral" as const, trendValue: "", icon: Calendar },
      { title: "Черновики", value: 0, trend: "neutral" as const, trendValue: "", icon: FileEdit },
    ];
  }
}

// Fetch queued posts
async function getQueuedPosts() {
  try {
    const publications = await prisma.publication.findMany({
      where: { status: "scheduled" },
      include: { content: true, channel: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });

    return publications.map((pub) => ({
      id: pub.id,
      platform: pub.channel.platform.toLowerCase(),
      contentPreview: pub.content.body?.substring(0, 100) || "Без описания",
      scheduledAt: pub.scheduledAt || new Date(),
      contentType: "post",
    }));
  } catch (error) {
    console.error("Error fetching queued posts:", error);
    return [];
  }
}

// Fetch recent activity
async function getRecentActivity() {
  try {
    const [recentPublications, recentContent] = await Promise.all([
      prisma.publication.findMany({
        where: { status: "published" },
        include: { channel: true, content: true },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
      prisma.content.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const activities = [
      ...recentPublications.map((pub) => ({
        id: pub.id,
        type: "published" as const,
        description: `Опубликовано в ${pub.channel.platform}`,
        timestamp: pub.publishedAt || new Date(),
        platform: pub.channel.platform.toLowerCase(),
        contentType: "post",
      })),
      ...recentContent.map((content) => ({
        id: content.id,
        type: content.status === "draft" ? "drafted" as const : "generated" as const,
        description: content.title || "Новый контент",
        timestamp: content.createdAt,
        contentType: "post",
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 8);

    return activities;
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}

// Fetch products for selector
async function getProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const [metrics, queuedPosts, activities, products] = await Promise.all([
    getMetrics(),
    getQueuedPosts(),
    getRecentActivity(),
    getProducts(),
  ]);

  return (
    <div className="space-y-8">
      {/* Welcome Section with Product Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Добро пожаловать в NEXUS
          </h1>
          <p className="mt-2 text-muted-foreground">
            Единая платформа для создания, публикации и аналитики контента
          </p>
        </div>
        {products.length > 0 && (
          <div className="flex items-center gap-3">
            <label htmlFor="product-select" className="text-sm font-medium text-foreground">
              Продукт:
            </label>
            <select
              id="product-select"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue="all"
            >
              <option value="all">Все продукты</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <KPICards metrics={metrics} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <QuickActions />
          <QueuePreview posts={queuedPosts} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1">
          <RecentActivity events={activities} maxEvents={8} />
        </div>
      </div>
    </div>
  );
}
