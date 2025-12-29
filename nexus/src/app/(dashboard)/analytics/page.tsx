"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsChart } from "@/components/analytics/metrics-chart";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Calendar,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";

interface AnalyticsData {
  metrics: {
    totalPosts: number;
    totalEngagement: number;
    totalReach: number;
    engagementRate: number;
  };
  platformData: Array<{
    platform: string;
    count: number;
  }>;
  topContent: Array<{
    id: string;
    preview: string;
    engagement: number;
    platforms: string[];
    publishedAt: string;
  }>;
  dailyData: Array<{
    date: string;
    publications: number;
    engagement: number;
  }>;
}

export default function AnalyticsPage() {
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    metrics: {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      engagementRate: 0,
    },
    platformData: [],
    topContent: [],
    dailyData: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedProduct, dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // In production, this would be an API call
      // const response = await fetch(`/api/analytics?product=${selectedProduct}&days=${dateRange}`);
      // const data = await response.json();

      // Mock data for demonstration
      const mockData: AnalyticsData = {
        metrics: {
          totalPosts: 127,
          totalEngagement: 4523,
          totalReach: 45230,
          engagementRate: 10.01,
        },
        platformData: [
          { platform: "Twitter", count: 45 },
          { platform: "LinkedIn", count: 32 },
          { platform: "Facebook", count: 28 },
          { platform: "Instagram", count: 22 },
        ],
        topContent: [
          {
            id: "1",
            preview: "5 ways to improve your marketing strategy in 2025...",
            engagement: 892,
            platforms: ["Twitter", "LinkedIn"],
            publishedAt: format(subDays(new Date(), 2), "yyyy-MM-dd"),
          },
          {
            id: "2",
            preview: "New product launch announcement! Excited to share...",
            engagement: 756,
            platforms: ["Twitter", "Facebook", "Instagram"],
            publishedAt: format(subDays(new Date(), 5), "yyyy-MM-dd"),
          },
          {
            id: "3",
            preview: "Behind the scenes: How we built our latest feature...",
            engagement: 623,
            platforms: ["LinkedIn"],
            publishedAt: format(subDays(new Date(), 7), "yyyy-MM-dd"),
          },
          {
            id: "4",
            preview: "Industry insights: The future of social media marketing...",
            engagement: 512,
            platforms: ["Twitter", "LinkedIn"],
            publishedAt: format(subDays(new Date(), 10), "yyyy-MM-dd"),
          },
          {
            id: "5",
            preview: "Customer success story: How @company achieved 10x growth...",
            engagement: 487,
            platforms: ["LinkedIn", "Twitter"],
            publishedAt: format(subDays(new Date(), 12), "yyyy-MM-dd"),
          },
        ],
        dailyData: generateDailyData(parseInt(dateRange)),
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = (days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, "MMM dd"),
        publications: Math.floor(Math.random() * 8) + 2,
        engagement: Math.floor(Math.random() * 300) + 50,
      });
    }
    return data;
  };

  const getPlatformColor = (platform: string): string => {
    const colors: Record<string, string> = {
      Twitter: "bg-blue-500",
      LinkedIn: "bg-blue-700",
      Facebook: "bg-blue-600",
      Instagram: "bg-pink-500",
      YouTube: "bg-red-600",
      TikTok: "bg-black",
    };
    return colors[platform] || "bg-gray-500";
  };

  const getPlatformBadgeVariant = (platform: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Twitter: "default",
      LinkedIn: "secondary",
      Facebook: "outline",
      Instagram: "destructive",
    };
    return variants[platform] || "default";
  };

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Аналитика
          </h1>
          <p className="mt-2 text-muted-foreground">
            Отслеживайте эффективность контента и метрики вовлечённости
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Последние 7 дней</SelectItem>
                <SelectItem value="14">Последние 14 дней</SelectItem>
                <SelectItem value="30">Последние 30 дней</SelectItem>
                <SelectItem value="60">Последние 60 дней</SelectItem>
                <SelectItem value="90">Последние 90 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Selector */}
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите продукт" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все продукты</SelectItem>
              <SelectItem value="product-1">Продукт Альфа</SelectItem>
              <SelectItem value="product-2">Продукт Бета</SelectItem>
              <SelectItem value="product-3">Продукт Гамма</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего постов
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.metrics.totalPosts}</div>
            <div className="flex items-center mt-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="font-medium text-green-600">+12.5%</span>
              <span className="text-muted-foreground ml-1">за прошлый период</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Вовлечённость
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.metrics.totalEngagement.toLocaleString()}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="font-medium text-green-600">+18.2%</span>
              <span className="text-muted-foreground ml-1">за прошлый период</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Охват
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.metrics.totalReach.toLocaleString()}
            </div>
            <div className="flex items-center mt-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="font-medium text-green-600">+24.8%</span>
              <span className="text-muted-foreground ml-1">за прошлый период</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Коэф. вовлечённости
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.metrics.engagementRate.toFixed(2)}%
            </div>
            <div className="flex items-center mt-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="font-medium text-green-600">+3.1%</span>
              <span className="text-muted-foreground ml-1">за прошлый период</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Publications Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Публикации по времени</CardTitle>
            <CardDescription>
              Количество публикаций за выбранный период
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricsChart
              data={analyticsData.dailyData}
              type="line"
              dataKey="publications"
              xAxisKey="date"
              color="#3b82f6"
            />
          </CardContent>
        </Card>

        {/* Engagement Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика вовлечённости</CardTitle>
            <CardDescription>
              Метрики вовлечённости по времени
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricsChart
              data={analyticsData.dailyData}
              type="line"
              dataKey="engagement"
              xAxisKey="date"
              color="#10b981"
            />
          </CardContent>
        </Card>

        {/* Publications by Platform */}
        <Card>
          <CardHeader>
            <CardTitle>Публикации по платформам</CardTitle>
            <CardDescription>
              Распределение постов по платформам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricsChart
              data={analyticsData.platformData}
              type="bar"
              dataKey="count"
              xAxisKey="platform"
              color="#8b5cf6"
            />
          </CardContent>
        </Card>

        {/* Channel Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Эффективность каналов</CardTitle>
            <CardDescription>
              Сравнение эффективности различных каналов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.platformData.map((platform, index) => {
                const total = analyticsData.platformData.reduce(
                  (sum, p) => sum + p.count,
                  0
                );
                const percentage = ((platform.count / total) * 100).toFixed(1);

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{platform.platform}</span>
                      <span className="text-muted-foreground">
                        {platform.count} постов ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPlatformColor(platform.platform)} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Лучший контент
          </CardTitle>
          <CardDescription>
            Ваши лучшие посты по уровню вовлечённости
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.topContent.map((content, index) => (
              <div
                key={content.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium line-clamp-2">
                    {content.preview}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(content.publishedAt), "MMM dd, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{content.engagement.toLocaleString()} взаимодействий</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {content.platforms.map((platform) => (
                      <Badge
                        key={platform}
                        variant={getPlatformBadgeVariant(platform)}
                        className="text-xs"
                      >
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
