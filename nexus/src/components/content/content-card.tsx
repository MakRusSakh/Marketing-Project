import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Twitter,
  Linkedin,
  Send,
  MessageSquare,
  Instagram,
  Globe,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentCardProps {
  id: string;
  title?: string;
  preview: string;
  status: "draft" | "ready" | "published" | "archived";
  platforms: string[];
  createdAt: Date | string;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  draft: { label: "Draft", variant: "secondary" as const },
  ready: { label: "Ready", variant: "default" as const },
  published: { label: "Published", variant: "default" as const },
  archived: { label: "Archived", variant: "outline" as const },
};

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  telegram: Send,
  discord: MessageSquare,
  instagram: Instagram,
  vk: Globe,
};

export function ContentCard({
  id,
  title,
  preview,
  status,
  platforms,
  createdAt,
  onEdit,
  onDuplicate,
  onDelete,
}: ContentCardProps) {
  const { label, variant } = statusConfig[status];
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const truncatedPreview =
    preview.length > 150 ? preview.substring(0, 150) + "..." : preview;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="font-semibold text-sm text-foreground mb-1 truncate">
                {title}
              </h3>
            )}
            <Badge variant={variant} className="text-xs">
              {label}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit?.(id)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDuplicate?.(id)}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(id)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {truncatedPreview}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {platforms.length > 0 ? (
              platforms.map((platform) => {
                const Icon = platformIcons[platform.toLowerCase()] || Globe;
                return (
                  <div
                    key={platform}
                    className="flex items-center justify-center h-6 w-6 rounded-full bg-muted"
                    title={platform}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                );
              })
            ) : (
              <span className="text-muted-foreground">No platforms</span>
            )}
          </div>
          <span>{formattedDate}</span>
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 bg-muted/50 border-t">
        <Link href={`/content/${id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            <Edit className="mr-2 h-3 w-3" />
            Edit Content
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
