"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  X,
  Calendar,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Publication {
  id: string;
  contentId: string;
  channelId: string;
  status: "scheduled" | "publishing" | "published" | "failed";
  scheduledAt?: Date | string;
  publishedAt?: Date | string;
  platformPostId?: string;
  platformUrl?: string;
  errorMessage?: string;
  content: {
    id: string;
    originalText: string;
    contentType: string;
  };
  channel: {
    id: string;
    platform: string;
    platformName?: string;
  };
}

interface QueueItemProps {
  publication: Publication;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
}

const platformConfig = {
  twitter: {
    icon: Twitter,
    name: "Twitter",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  linkedin: {
    icon: Linkedin,
    name: "LinkedIn",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  facebook: {
    icon: Facebook,
    name: "Facebook",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  instagram: {
    icon: Instagram,
    name: "Instagram",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  youtube: {
    icon: Youtube,
    name: "YouTube",
    color: "text-red-600",
    bg: "bg-red-50",
  },
};

const statusConfig = {
  scheduled: {
    icon: Clock,
    label: "Scheduled",
    variant: "secondary" as const,
    color: "text-blue-600 bg-blue-50",
  },
  publishing: {
    icon: Clock,
    label: "Publishing",
    variant: "default" as const,
    color: "text-yellow-600 bg-yellow-50",
  },
  published: {
    icon: CheckCircle2,
    label: "Published",
    variant: "default" as const,
    color: "text-green-600 bg-green-50",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    variant: "destructive" as const,
    color: "text-red-600 bg-red-50",
  },
};

export function QueueItem({
  publication,
  onView,
  onEdit,
  onCancel,
  onReschedule,
}: QueueItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const platform =
    platformConfig[publication.channel.platform as keyof typeof platformConfig];
  const status = statusConfig[publication.status];
  const StatusIcon = status.icon;
  const PlatformIcon = platform?.icon;

  const scheduledDate = publication.scheduledAt
    ? new Date(publication.scheduledAt)
    : null;
  const publishedDate = publication.publishedAt
    ? new Date(publication.publishedAt)
    : null;

  const displayTime = publishedDate || scheduledDate;
  const timeLabel = publishedDate ? "Published" : "Scheduled for";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Platform Icon */}
              {PlatformIcon && (
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0",
                    platform?.bg || "bg-gray-100"
                  )}
                >
                  <PlatformIcon
                    className={cn("h-5 w-5", platform?.color || "text-gray-600")}
                  />
                </div>
              )}

              {/* Content Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {publication.channel.platformName || platform?.name || "Unknown"}
                  </span>
                  <Badge className={cn("text-xs", status.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <p
                  className={cn(
                    "text-sm text-muted-foreground line-clamp-2",
                    !isExpanded && "line-clamp-2"
                  )}
                >
                  {publication.content.originalText}
                </p>
                {publication.content.originalText.length > 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-auto p-0 mt-1 text-xs text-primary hover:no-underline"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(publication.id)}
                  className="h-8 w-8"
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && publication.status === "scheduled" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(publication.id)}
                  className="h-8 w-8"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onReschedule && publication.status === "scheduled" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReschedule(publication.id)}
                  className="h-8 w-8"
                  title="Reschedule"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              )}
              {onCancel && publication.status === "scheduled" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCancel(publication.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {publication.content.originalText}
              </p>
            </div>
          )}

          {/* Footer Row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-4">
              {displayTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {timeLabel}{" "}
                    {formatDistanceToNow(displayTime, { addSuffix: true })}
                  </span>
                </div>
              )}
              <span className="text-muted-foreground/70">
                {publication.content.contentType}
              </span>
            </div>

            {publication.platformUrl && publication.status === "published" && (
              <a
                href={publication.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View on platform
              </a>
            )}
          </div>

          {/* Error Message */}
          {publication.status === "failed" && publication.errorMessage && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <span className="font-medium">Error:</span> {publication.errorMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
