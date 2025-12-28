import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Twitter,
  Linkedin,
  Send,
  MessageSquare,
  Instagram,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformPreviewProps {
  platform: string;
  content: string;
  hashtags?: string[];
  characterCount?: number;
  maxCharacters?: number;
  media?: { url: string; type: string }[];
}

const platformConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    name: string;
    maxChars: number;
    bgColor: string;
    textColor: string;
  }
> = {
  twitter: {
    icon: Twitter,
    name: "Twitter / X",
    maxChars: 280,
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  linkedin: {
    icon: Linkedin,
    name: "LinkedIn",
    maxChars: 3000,
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  telegram: {
    icon: Send,
    name: "Telegram",
    maxChars: 4096,
    bgColor: "bg-sky-50",
    textColor: "text-sky-600",
  },
  discord: {
    icon: MessageSquare,
    name: "Discord",
    maxChars: 2000,
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-600",
  },
  instagram: {
    icon: Instagram,
    name: "Instagram",
    maxChars: 2200,
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
  },
  vk: {
    icon: Globe,
    name: "VK",
    maxChars: 16384,
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
  },
};

export function PlatformPreview({
  platform,
  content,
  hashtags = [],
  characterCount,
  maxCharacters,
  media = [],
}: PlatformPreviewProps) {
  const config = platformConfig[platform.toLowerCase()] || {
    icon: Globe,
    name: platform,
    maxChars: 2000,
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
  };

  const Icon = config.icon;
  const charLimit = maxCharacters || config.maxChars;
  const actualCharCount = characterCount || content.length;
  const isOverLimit = actualCharCount > charLimit;
  const isNearLimit = actualCharCount > charLimit * 0.9;

  // Highlight hashtags in content
  const contentWithHashtags = content.split(/(\s+)/).map((word, index) => {
    if (word.startsWith("#")) {
      return (
        <span key={index} className="text-blue-600 font-medium">
          {word}
        </span>
      );
    }
    return <span key={index}>{word}</span>;
  });

  return (
    <Card className={cn("overflow-hidden", config.bgColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md", config.textColor, "bg-white")}>
              <Icon className="h-4 w-4" />
            </div>
            {config.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isOverLimit ? "destructive" : isNearLimit ? "outline" : "secondary"}
              className="text-xs"
            >
              {actualCharCount}/{charLimit}
            </Badge>
            {isOverLimit && (
              <span className="text-xs text-destructive font-medium">
                Over limit!
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-white rounded-t-lg">
        <div className="space-y-3">
          {/* Content Preview */}
          <div className="min-h-[100px] max-h-[300px] overflow-y-auto">
            <p className={cn(
              "text-sm whitespace-pre-wrap",
              isOverLimit && "text-destructive"
            )}>
              {contentWithHashtags}
            </p>
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {hashtags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs text-blue-600">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </Badge>
              ))}
            </div>
          )}

          {/* Media Preview */}
          {media.length > 0 && (
            <div className="pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                {media.slice(0, 4).map((item, index) => (
                  <div
                    key={index}
                    className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden"
                  >
                    {item.type.startsWith("image") ? (
                      <img
                        src={item.url}
                        alt={`Media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {item.type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform-specific styling mockup */}
          {platform.toLowerCase() === "twitter" && (
            <div className="pt-3 border-t flex items-center gap-4 text-muted-foreground">
              <button className="text-xs hover:text-foreground flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button className="text-xs hover:text-foreground flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button className="text-xs hover:text-foreground flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          )}

          {platform.toLowerCase() === "linkedin" && (
            <div className="pt-3 border-t flex items-center gap-4 text-muted-foreground">
              <button className="text-xs hover:text-foreground">Like</button>
              <button className="text-xs hover:text-foreground">Comment</button>
              <button className="text-xs hover:text-foreground">Repost</button>
              <button className="text-xs hover:text-foreground">Send</button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
