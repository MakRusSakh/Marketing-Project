import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QueuedPost {
  id: string;
  platform: "twitter" | "linkedin" | "facebook" | "instagram";
  contentPreview: string;
  scheduledAt: Date | string;
  contentType?: string;
}

export interface QueuePreviewProps {
  posts: QueuedPost[];
  className?: string;
}

const platformConfig = {
  twitter: {
    icon: Twitter,
    label: "Twitter",
    color: "bg-sky-500",
  },
  linkedin: {
    icon: Linkedin,
    label: "LinkedIn",
    color: "bg-blue-700",
  },
  facebook: {
    icon: Facebook,
    label: "Facebook",
    color: "bg-blue-600",
  },
  instagram: {
    icon: Instagram,
    label: "Instagram",
    color: "bg-pink-600",
  },
};

function formatScheduledTime(date: Date | string): string {
  const scheduled = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = scheduled.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  } else if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } else if (diffDays < 7) {
    return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  } else {
    return scheduled.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

export function QueuePreview({ posts, className }: QueuePreviewProps) {
  const displayPosts = posts.slice(0, 5);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Publishing Queue</CardTitle>
        <Link href="/queue">
          <Button variant="ghost" size="sm" className="gap-1">
            View All
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">
              No scheduled posts
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your publishing queue is empty. Create and schedule content to see it
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayPosts.map((post) => {
              const config = platformConfig[post.platform];
              const PlatformIcon = config.icon;

              return (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg text-white flex-shrink-0",
                      config.color
                    )}
                  >
                    <PlatformIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium line-clamp-2 flex-1">
                        {post.contentPreview}
                      </p>
                      {post.contentType && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {post.contentType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatScheduledTime(post.scheduledAt)}</span>
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
