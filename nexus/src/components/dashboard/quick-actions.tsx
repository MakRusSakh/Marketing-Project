"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, PenSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface QuickAction {
  label: string;
  description?: string;
  icon: typeof PenSquare;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export interface QuickActionsProps {
  actions?: QuickAction[];
  className?: string;
}

const defaultActions: QuickAction[] = [
  {
    label: "Создать контент",
    description: "Генерация контента с помощью ИИ",
    icon: PenSquare,
    href: "/content",
    variant: "default",
  },
  {
    label: "Новая автоматизация",
    description: "Настроить автопубликацию",
    icon: Sparkles,
    href: "/automations/new",
    variant: "outline",
  },
  {
    label: "Аналитика",
    description: "Посмотреть статистику",
    icon: BarChart3,
    href: "/analytics",
    variant: "outline",
  },
  {
    label: "Очередь публикаций",
    description: "Планировать посты",
    icon: Calendar,
    href: "/queue",
    variant: "outline",
  },
];

export function QuickActions({ actions = defaultActions, className }: QuickActionsProps) {
  const router = useRouter();

  const handleAction = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Быстрые действия</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isPrimary = action.variant === "default";

            return (
              <Button
                key={index}
                variant={action.variant || "outline"}
                onClick={() => handleAction(action)}
                className={cn(
                  "h-auto flex-col items-start gap-2 p-4 hover:shadow-md transition-all",
                  isPrimary && "bg-primary text-primary-foreground hover:bg-primary/90",
                  action.className
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={cn("h-5 w-5", isPrimary ? "text-primary-foreground" : "text-primary")} />
                  <span className="font-semibold text-sm">{action.label}</span>
                </div>
                {action.description && (
                  <span className={cn(
                    "text-xs font-normal text-left w-full",
                    isPrimary ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {action.description}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
