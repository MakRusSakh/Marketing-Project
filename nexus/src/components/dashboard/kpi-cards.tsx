import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPIMetric {
  title: string;
  value: number | string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: LucideIcon;
}

export interface KPICardsProps {
  metrics: KPIMetric[];
}

export function KPICards({ metrics }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const isPositive = metric.trend === "up";
        const isNegative = metric.trend === "down";
        const isNeutral = metric.trend === "neutral";

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {!isNeutral && (
                <div className="flex items-center mt-1 text-xs">
                  {isPositive && (
                    <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                  )}
                  {isNegative && (
                    <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      isPositive && "text-green-600",
                      isNegative && "text-red-600"
                    )}
                  >
                    {metric.trendValue}
                  </span>
                  <span className="text-muted-foreground ml-1">from last period</span>
                </div>
              )}
              {isNeutral && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {metric.trendValue}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
