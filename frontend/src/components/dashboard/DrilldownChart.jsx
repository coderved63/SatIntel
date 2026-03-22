import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTooltipDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]} ${MONTHS[parseInt(parts[1],10)-1] || parts[1]} ${parts[0]}`;
}

export default function DrilldownChart({ data, label, color = '#06B6D4', unit = '', height = 200 }) {
  const [zoomedYear, setZoomedYear] = useState(null);

  // Aggregate by year
  const yearlyData = useMemo(() => {
    if (!data?.length) return [];
    const groups = {};
    data.forEach(d => {
      const year = d.date?.split('-')[0];
      if (!year) return;
      if (!groups[year]) groups[year] = [];
      groups[year].push(d.value);
    });
    return Object.entries(groups)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([year, vals]) => ({
        label: year,
        value: +(vals.reduce((s,v) => s+v, 0) / vals.length).toFixed(4),
        min: +Math.min(...vals).toFixed(4),
        max: +Math.max(...vals).toFixed(4),
        points: vals.length,
        year,
      }));
  }, [data]);

  // Monthly data for zoomed year
  const monthlyData = useMemo(() => {
    if (!zoomedYear || !data?.length) return [];
    const groups = {};
    data.forEach(d => {
      if (!d.date?.startsWith(zoomedYear)) return;
      const month = d.date.substring(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(d.value);
    });
    return Object.entries(groups)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        label: MONTHS[parseInt(month.split('-')[1], 10) - 1],
        value: +(vals.reduce((s,v) => s+v, 0) / vals.length).toFixed(4),
        min: +Math.min(...vals).toFixed(4),
        max: +Math.max(...vals).toFixed(4),
        points: vals.length,
      }));
  }, [data, zoomedYear]);

  const chartData = zoomedYear ? monthlyData : yearlyData;
  const gradId = `ddc-${(color||'').replace('#','')}-${Math.random().toString(36).slice(2,5)}`;

  if (!data?.length) {
    return <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No data available</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label} {zoomedYear ? `— ${zoomedYear}` : ''}
        </h3>
        <div>
          {zoomedYear ? (
            <button
              onClick={() => setZoomedYear(null)}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
            >
              ← All Years
            </button>
          ) : (
            <span className="text-[9px] italic" style={{ color: 'var(--text-faint)' }}>Click to drill in</span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 5, left: 5 }}
          onClick={(e) => { if (!zoomedYear && e?.activeLabel) setZoomedYear(e.activeLabel); }}
          style={{ cursor: zoomedYear ? 'default' : 'pointer' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--chart-text)', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
          />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} tickLine={false} axisLine={false} width={45} tickCount={5} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: 'var(--shadow-lg)',
            }}
            labelStyle={{ color: 'var(--tooltip-text)', fontSize: 11, marginBottom: 4 }}
            itemStyle={{ color, fontSize: 13, fontWeight: 600 }}
            formatter={(v, name, props) => {
              const d = props.payload;
              return [`Avg: ${v} ${unit} | Min: ${d.min} | Max: ${d.max}`, ''];
            }}
            labelFormatter={(l) => zoomedYear ? `${l} ${zoomedYear}` : l}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={{ r: 4, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
