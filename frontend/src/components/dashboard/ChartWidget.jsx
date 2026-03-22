import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatSmartLabel(dateStr, index, data) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const monthName = MONTH_NAMES[month - 1] || '';

  // If it's January or first data point, show "Jan '20" style
  if (month === 1 || index === 0) {
    return `${monthName} '${year.slice(2)}`;
  }
  return monthName;
}

function formatTooltipDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = MONTH_NAMES[parseInt(parts[1], 10) - 1] || parts[1];
  return `${parts[2]} ${month} ${parts[0]}`;
}

export default function ChartWidget({ data, xKey = 'date', yKey = 'value', color = '#06B6D4', unit = '', height = 200 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No data available</div>;
  }

  // Compute smart tick interval based on data density
  const totalPoints = data.length;
  let tickCount;
  if (totalPoints <= 24) tickCount = totalPoints;
  else if (totalPoints <= 50) tickCount = 8;
  else if (totalPoints <= 100) tickCount = 10;
  else tickCount = 12;

  const tickInterval = Math.max(1, Math.floor(totalPoints / tickCount));

  const gradientId = `gradient-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--chart-text)', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-grid)' }}
          interval={tickInterval}
          tickFormatter={(val, i) => formatSmartLabel(val, i, data)}
        />
        <YAxis
          tick={{ fill: 'var(--chart-text)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={45}
          tickCount={5}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-lg)',
          }}
          labelStyle={{ color: 'var(--tooltip-text)', fontSize: 11, marginBottom: 4 }}
          itemStyle={{ color: color, fontSize: 13, fontWeight: 600 }}
          formatter={(value) => [`${Number(value).toFixed(4)} ${unit}`, '']}
          labelFormatter={(label) => formatTooltipDate(label)}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#1E293B', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
