import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Facebook,
  FileText,
  Instagram,
  Linkedin,
  Sparkles,
  Twitter,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityType =
  | "published"
  | "scheduled"
  | "generated"
  | "drafted"
  | "failed"
  | "cancelled";

export type Platform = "twitter" | "linkedin" | "facebook" | "instagram" | "telegram" | "vk" | "discord" | "all";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: Date | string;
  platform?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
}

export interface RecentActivityProps {
  events: ActivityEvent[];
  maxEvents?: number;
  className?: string;
}

const activityConfig = {
  published: {
    icon: CheckCircle2,
    label: "Опубликовано",
    color: "text-green-600",
    bgColor: "bg-green-100",
    badgeVariant: "default" as const,
  },
  scheduled: {
    icon: Calendar,
    label: "Запланировано",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    badgeVariant: "secondary" as const,
  },
  generated: {
    icon: Sparkles,
    label: "Сгенерировано",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    badgeVariant: "secondary" as const,
  },
  drafted: {
    icon: FileText,
    label: "Черновик",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    badgeVariant: "outline" as const,
  },
  failed: {
    icon: XCircle,
    label: "Ошибка",
    color: "text-red-600",
    bgColor: "bg-red-100",
    badgeVariant: "destructive" as const,
  },
  cancelled: {
    icon: XCircle,
    label: "Отменено",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    badgeVariant: "outline" as const,
  },
};

const platformConfig: Record<string, { icon: typeof Twitter; label: string; color: string }> = {
  twitter: {
    icon: Twitter,
    label: "Twitter",
    color: "text-sky-600",
  },
  linkedin: {
    icon: Linkedin,
    label: "LinkedIn",
    color: "text-blue-700",
  },
  facebook: {
    icon: Facebook,
    label: "Facebook",
    color: "text-blue-600",
  },
  instagram: {
    icon: Instagram,
    label: "Instagram",
    color: "text-pink-600",
  },
  telegram: {
    icon: Activity,
    label: "Telegram",
    color: "text-blue-400",
  },
  vk: {
    icon: Activity,
    label: "ВКонтакте",
    color: "text-blue-500",
  },
  discord: {
    icon: Activity,
    label: "Discord",
    color: "text-indigo-500",
  },
  all: {
    icon: Activity,
    label: "Все платформы",
    color: "text-gray-600",
  },
};

function formatRelativeTime(date: Date | string): string {
  const timestamp = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSeconds < 60) {
    return "только что";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} мин. назад`;
  } else if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  } else if (diffDays < 7) {
    return `${diffDays} дн. назад`;
  } else {
    return timestamp.toLocaleDateString("ru-RU", {
      month: "short",
      day: "numeric",
      year: timestamp.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export function RecentActivity({
  events,
  maxEvents = 10,
  className,
}: RecentActivityProps) {
  const displayEvents = events.slice(0, maxEvents);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Последняя активность</CardTitle>
      </CardHeader>
      <CardContent>
        {displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">
              Нет активности
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Лента активности пуста. Начните создавать и публиковать контент.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayEvents.map((event) => {
              const config = activityConfig[event.type];
              const ActivityIcon = config.icon;
              const platformInfo = event.platform
                ? platformConfig[event.platform.toLowerCase()]
                : null;
              const PlatformIcon = platformInfo?.icon;

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-0 border-border"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-full flex-shrink-0",
                      config.bgColor
                    )}
                  >
                    <ActivityIcon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-foreground line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(event.timestamp)}</span>
                      </div>
                      {platformInfo && PlatformIcon && (
                        <div className="flex items-center gap-1">
                          <PlatformIcon
                            className={cn("h-3 w-3", platformInfo.color)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {platformInfo.label}
                          </span>
                        </div>
                      )}
                      {event.contentType && (
                        <Badge variant="outline" className="text-xs">
                          {event.contentType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
