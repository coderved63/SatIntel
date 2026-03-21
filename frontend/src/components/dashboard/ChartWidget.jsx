import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ChartWidget({ data, xKey = 'date', yKey = 'value', color = '#06B6D4', unit = '', height = 200 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No data available</div>;
  }

  // Truncate date labels
  const chartData = data.map(d => ({
    ...d,
    shortDate: d[xKey] ? d[xKey].substring(5) : '',
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="shortDate" tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} axisLine={false} width={45} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
          labelStyle={{ color: '#94A3B8' }}
          itemStyle={{ color: color }}
          formatter={(value) => [`${value} ${unit}`, '']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#gradient-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
