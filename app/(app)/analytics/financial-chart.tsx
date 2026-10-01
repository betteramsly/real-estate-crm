"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

export function FinancialChart({
  data,
}: {
  data: Array<{ label: string; gross: number; revenue: number }>;
}) {
  const hasValues = data.some((row) => row.gross > 0 || row.revenue > 0);

  if (!hasValues) {
    return (
      <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
        За выбранный период нет успешно закрытых сделок с заполненными суммами.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="analyticsGrossFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.45}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            width={58}
            tickFormatter={(value) =>
              value >= 1_000_000
                ? `${(value / 1_000_000).toFixed(1)} млн`
                : value >= 1_000
                  ? `${Math.round(value / 1_000)} тыс.`
                  : String(value)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "gross" ? "Валовый объём" : "Комиссия компании",
            ]}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Legend
            formatter={(value) =>
              value === "gross" ? "Валовый объём" : "Комиссия компании"
            }
          />
          <Area
            type="monotone"
            dataKey="gross"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#analyticsGrossFill)"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fill="url(#analyticsRevenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
