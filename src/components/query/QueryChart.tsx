"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  AreaChart as AreaChartIcon,
  Hash,
} from "lucide-react";
import { ChartTypePicker } from "./ChartTypePicker";

interface QueryColumn {
  name: string;
  type: string;
}

interface QueryChartProps {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  vizSettings?: VizSettings;
  onVizSettingsChange?: (settings: VizSettings) => void;
}

export interface VizSettings {
  chartType: "table" | "bar" | "line" | "area" | "pie" | "scatter" | "number";
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  colors?: string[];
}

export const CHART_COLORS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "area", label: "Area Chart", icon: AreaChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "scatter", label: "Scatter Plot", icon: ScatterChartIcon },
  { value: "number", label: "Number", icon: Hash },
];

export function isNumericType(type: string): boolean {
  const numericTypes = [
    "integer",
    "int",
    "int4",
    "int8",
    "bigint",
    "smallint",
    "float",
    "float4",
    "float8",
    "double",
    "decimal",
    "numeric",
    "real",
    "number",
  ];
  return numericTypes.some((t) => type.toLowerCase().includes(t));
}

export function QueryChart({
  columns,
  rows,
  vizSettings,
  onVizSettingsChange,
}: QueryChartProps) {
  // Auto-detect best chart settings
  const autoSettings = useMemo(() => {
    const numericCols = columns.filter((c) => isNumericType(c.type));
    const categoryCols = columns.filter((c) => !isNumericType(c.type));

    return {
      chartType: numericCols.length > 0 ? "bar" : "table",
      xAxis: categoryCols[0]?.name || columns[0]?.name,
      yAxis: numericCols[0]?.name || columns[1]?.name,
    } as VizSettings;
  }, [columns]);

  const settings = vizSettings || autoSettings;
  const [localSettings, setLocalSettings] = useState<VizSettings>(settings);

  const updateSettings = (updates: Partial<VizSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    onVizSettingsChange?.(newSettings);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!localSettings.xAxis) return rows;

    // For pie charts, aggregate by x-axis
    if (localSettings.chartType === "pie" && localSettings.yAxis) {
      const aggregated: Record<string, number> = {};
      rows.forEach((row) => {
        const key = String(row[localSettings.xAxis!] ?? "Unknown");
        const value = Number(row[localSettings.yAxis!]) || 0;
        aggregated[key] = (aggregated[key] || 0) + value;
      });
      return Object.entries(aggregated).map(([name, value]) => ({
        name,
        value,
      }));
    }

    return rows;
  }, [rows, localSettings]);

  // Number display for single value
  if (localSettings.chartType === "number") {
    const value = rows[0]?.[localSettings.yAxis || columns[0]?.name];
    const numValue =
      typeof value === "number" ? value : parseFloat(String(value)) || 0;

    return (
      <div className="flex flex-col gap-4">
        <ChartControls
          columns={columns}
          settings={localSettings}
          onUpdate={updateSettings}
        />
        <Card className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary">
              {numValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {localSettings.yAxis || columns[0]?.name}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ChartControls
        columns={columns}
        settings={localSettings}
        onUpdate={updateSettings}
      />

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {localSettings.chartType === "bar" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={localSettings.xAxis}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey={localSettings.yAxis || ""}
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : localSettings.chartType === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={localSettings.xAxis}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={localSettings.yAxis || ""}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[0], strokeWidth: 2 }}
              />
            </LineChart>
          ) : localSettings.chartType === "area" ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={localSettings.xAxis}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={localSettings.yAxis || ""}
                fill={CHART_COLORS[0]}
                fillOpacity={0.3}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
              />
            </AreaChart>
          ) : localSettings.chartType === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          ) : localSettings.chartType === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={localSettings.xAxis}
                type="number"
                name={localSettings.xAxis}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                dataKey={localSettings.yAxis}
                type="number"
                name={localSettings.yAxis}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Scatter data={chartData} fill={CHART_COLORS[0]} />
            </ScatterChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={localSettings.xAxis} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={localSettings.yAxis || ""} fill={CHART_COLORS[0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartControls({
  columns,
  settings,
  onUpdate,
}: {
  columns: QueryColumn[];
  settings: VizSettings;
  onUpdate: (updates: Partial<VizSettings>) => void;
}) {
  const numericColumns = columns.filter((c) => isNumericType(c.type));

  return (
    <div className="flex flex-wrap items-end gap-4 p-3 bg-muted/30 rounded-lg border">
      {/* Chart Type */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Chart Type</Label>
        <ChartTypePicker
          value={settings.chartType}
          onChange={(value) =>
            onUpdate({ chartType: value as VizSettings["chartType"] })
          }
          size="sm"
        />
      </div>

      {/* X-Axis */}
      {settings.chartType !== "number" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {settings.chartType === "pie" ? "Category" : "X-Axis"}
          </Label>
          <Select
            value={settings.xAxis}
            onValueChange={(value) => onUpdate({ xAxis: value })}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Y-Axis / Value */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          {settings.chartType === "pie" || settings.chartType === "number"
            ? "Value"
            : "Y-Axis"}
        </Label>
        <Select
          value={settings.yAxis}
          onValueChange={(value) => onUpdate({ yAxis: value })}
        >
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Select column" />
          </SelectTrigger>
          <SelectContent>
            {(numericColumns.length > 0 ? numericColumns : columns).map(
              (col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
