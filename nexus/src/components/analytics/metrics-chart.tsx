"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface ChartData {
  [key: string]: string | number;
}

export interface MetricsChartProps {
  data: ChartData[];
  type: "line" | "bar";
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export function MetricsChart({
  data,
  type,
  dataKey,
  xAxisKey,
  color = "#3b82f6",
  height = 300,
  showGrid = true,
  showTooltip = true,
}: MetricsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        values: [],
        labels: [],
        maxValue: 0,
        minValue: 0,
      };
    }

    const values = data.map((item) => Number(item[dataKey]) || 0);
    const labels = data.map((item) => String(item[xAxisKey]));
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);

    return { values, labels, maxValue, minValue };
  }, [data, dataKey, xAxisKey]);

  const { values, labels, maxValue, minValue } = chartData;

  if (values.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-secondary/20 rounded-lg"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const range = maxValue - minValue || 1;
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = 100;
  const barWidth = chartWidth / values.length;

  // Calculate positions for line chart
  const linePoints = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * chartWidth;
      const y = chartHeight - ((value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // Calculate area path for line chart
  const areaPath = `M 0,${chartHeight} L ${linePoints} L ${chartWidth},${chartHeight} Z`;

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {showGrid && (
            <g className="text-muted-foreground/20">
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = padding + chartHeight * (1 - fraction);
                return (
                  <line
                    key={fraction}
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.2"
                    strokeDasharray="2,2"
                  />
                );
              })}
            </g>
          )}

          {/* Chart content */}
          <g transform={`translate(0, ${padding})`}>
            {type === "bar" ? (
              // Bar chart
              values.map((value, index) => {
                const barHeight = ((value - minValue) / range) * chartHeight;
                const x = (index / values.length) * chartWidth + barWidth * 0.1;
                const y = chartHeight - barHeight;
                const width = barWidth * 0.8;

                return (
                  <g key={index} className="group">
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={barHeight}
                      fill={color}
                      className="transition-opacity hover:opacity-80"
                      rx="1"
                    />
                    {showTooltip && (
                      <title>
                        {labels[index]}: {value}
                      </title>
                    )}
                  </g>
                );
              })
            ) : (
              // Line chart
              <>
                {/* Area fill */}
                <path
                  d={areaPath}
                  fill={color}
                  opacity="0.1"
                  className="transition-opacity"
                />

                {/* Line */}
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />

                {/* Data points */}
                {values.map((value, index) => {
                  const x = (index / (values.length - 1 || 1)) * chartWidth;
                  const y = chartHeight - ((value - minValue) / range) * chartHeight;

                  return (
                    <g key={index} className="group">
                      <circle
                        cx={x}
                        cy={y}
                        r="3"
                        fill={color}
                        className="transition-all hover:r-5"
                      />
                      {showTooltip && (
                        <title>
                          {labels[index]}: {value}
                        </title>
                      )}
                    </g>
                  );
                })}
              </>
            )}
          </g>
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground pointer-events-none">
          {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map(
            (value, index) => (
              <div key={index} className="h-4 flex items-center">
                {Math.round(value)}
              </div>
            )
          )}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {labels.map((label, index) => {
          // Show fewer labels on smaller screens
          const shouldShow =
            labels.length <= 7 ||
            index === 0 ||
            index === labels.length - 1 ||
            index % Math.ceil(labels.length / 7) === 0;

          return shouldShow ? (
            <div key={index} className="flex-1 text-center">
              {label}
            </div>
          ) : (
            <div key={index} className="flex-1" />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <div
          className="w-3 h-3 rounded"
          style={{ backgroundColor: color }}
        />
        <span className="text-muted-foreground capitalize">{dataKey}</span>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Max</div>
          <div className="text-sm font-semibold">{Math.round(maxValue)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Avg</div>
          <div className="text-sm font-semibold">
            {Math.round(values.reduce((a, b) => a + b, 0) / values.length)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-sm font-semibold">
            {Math.round(values.reduce((a, b) => a + b, 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple responsive chart component for displaying metrics
 * Supports both line and bar chart types with customizable colors
 * Built with SVG for optimal performance and responsiveness
 * No external chart library dependencies
 */
export function SimpleMetricsChart({
  data,
  type = "line",
  className,
}: {
  data: Array<{ label: string; value: number }>;
  type?: "line" | "bar";
  className?: string;
}) {
  const transformedData = data.map((item) => ({
    date: item.label,
    value: item.value,
  }));

  return (
    <div className={cn("w-full", className)}>
      <MetricsChart
        data={transformedData}
        type={type}
        dataKey="value"
        xAxisKey="date"
        color="#3b82f6"
      />
    </div>
  );
}
