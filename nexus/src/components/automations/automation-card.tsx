"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Zap,
  Calendar,
  Webhook,
  Activity,
  Edit,
  Copy,
  Trash2,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Automation {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: any;
  actions: any;
  enabled: boolean;
  lastTriggered?: Date | string;
  triggerCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface AutomationCardProps {
  automation: Automation;
  onToggle?: (id: string, enabled: boolean) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewLogs?: (id: string) => void;
}

const triggerTypeConfig = {
  webhook: {
    icon: Webhook,
    label: "Webhook",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  schedule: {
    icon: Calendar,
    label: "Расписание",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  event: {
    icon: Activity,
    label: "Событие",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  manual: {
    icon: Zap,
    label: "Вручную",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
};

export function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onViewLogs,
}: AutomationCardProps) {
  const [isToggling, setIsToggling] = useState(false);

  const triggerConfig =
    triggerTypeConfig[automation.triggerType as keyof typeof triggerTypeConfig] ||
    triggerTypeConfig.manual;
  const TriggerIcon = triggerConfig.icon;

  const handleToggle = async (checked: boolean) => {
    if (onToggle) {
      setIsToggling(true);
      try {
        await onToggle(automation.id, checked);
      } finally {
        setIsToggling(false);
      }
    }
  };

  const getActionSummary = () => {
    const actions = automation.actions;
    if (Array.isArray(actions)) {
      const count = actions.length;
      if (count === 1) return "1 действие";
      if (count >= 2 && count <= 4) return `${count} действия`;
      return `${count} действий`;
    }
    return "Нет действий";
  };

  return (
    <Card className={cn("hover:shadow-md transition-all", !automation.enabled && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg truncate">{automation.name}</CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0",
                  triggerConfig.bg,
                  triggerConfig.border,
                  triggerConfig.color
                )}
              >
                <TriggerIcon className="h-3 w-3 mr-1" />
                {triggerConfig.label}
              </Badge>
            </div>
            {automation.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {automation.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={automation.enabled}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Запусков</p>
            <p className="text-lg font-semibold">{automation.triggerCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Последний запуск</p>
            <p className="text-sm font-medium">
              {automation.lastTriggered
                ? formatDistanceToNow(new Date(automation.lastTriggered), {
                    addSuffix: true,
                  })
                : "Никогда"}
            </p>
          </div>
        </div>

        {/* Action Summary */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span>{getActionSummary()}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(automation.id)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(automation.id)}
              title="Дублировать"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {onViewLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewLogs(automation.id)}
              title="Просмотреть логи"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(automation.id)}
              className="text-destructive hover:text-destructive"
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
