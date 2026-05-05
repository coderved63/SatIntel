import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatSmartLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const monthName = MONTH_NAMES[month - 1] || '';
  if (month === 1) return `${monthName} '${year.slice(2)}`;
  return monthName;
}

function formatTooltipDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = MONTH_NAMES[parseInt(parts[1], 10) - 1] || parts[1];
  return `${parts[2]} ${month} ${parts[0]}`;
}

/**
 * Timeline of city-mean historical series + directional forecast (same API as Analytics trends).
 * Intentionally omits numeric “scores”, model identifiers, or up/down badges — chart + window copy only.
 */
export default function DashboardForecastChart({
  data,
  label,
  histColor = '#3B82F6',
  forecastColor = '#F59E0B',
  unit = '',
  height = 200,
}) {
  if (!data) {
    return <div className="flex items-center justify-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>Loading trend…</div>;
  }

  const { historical = {}, forecast = {} } = data;
  const histEntries = Object.entries(historical).map(([date, value]) => ({
    date,
    value: Number(value),
    type: 'historical',
  }));
  const forecastEntries = Object.entries(forecast).map(([date, value]) => ({
    date,
    forecast: Number(value),
    type: 'forecast',
  }));

  if (!histEntries.length) {
    return <div className="flex items-center justify-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>No history in this window.</div>;
  }

  const td = data.trend_direction;
  const blocked = td === 'insufficient_data' || td === 'unknown';
  const hasForecast = forecastEntries.length > 0 && !blocked;

  if (hasForecast && forecastEntries.length > 0) {
    const last = histEntries[histEntries.length - 1];
    last.forecast = last.value;
  }

  const chartData = hasForecast ? [...histEntries, ...forecastEntries] : histEntries;

  const tickInterval = Math.max(1, Math.floor(chartData.length / 10));

  return (
    <div>
      <div className="mb-2 space-y-0.5">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</h3>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
          {data.date_range?.start || '—'} → {hasForecast ? `${data.date_range?.end || '—'} + ${data.forecast_days || 0}d projection (${data.forecast_step_days || 1}-day cadence)` : (data.date_range?.end || '—')}
          {hasForecast ? '' : blocked ? ' · Projection requires more timestamps in range.' : ' · No forward projection for this slice.'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--chart-text)', fontSize: 9 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            interval={tickInterval}
            tickFormatter={formatSmartLabel}
          />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 9 }} tickLine={false} axisLine={false} width={42} tickCount={5} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: 11,
            }}
            labelStyle={{ color: 'var(--tooltip-text)', marginBottom: 4 }}
            labelFormatter={formatTooltipDate}
            formatter={(value, key) => {
              if (value == null || Number.isNaN(Number(value))) return null;
              const v = `${Number(value).toFixed(unit === 'NDVI' ? 4 : 2)} ${unit}`.trim();
              if (key === 'forecast') return [v, 'Projection'];
              return [v, 'Observed (city mean)'];
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={histColor}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, fill: histColor, stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
            name="Historical"
            connectNulls
          />
          {hasForecast ? (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={forecastColor}
              strokeWidth={1.75}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, fill: forecastColor, stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
              name="Projection"
              connectNulls
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>

      {hasForecast ? (
        <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 rounded" style={{ background: histColor }} />
            City mean (window)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-t border-dashed" style={{ borderColor: forecastColor }} />
            Continuation path
          </span>
        </div>
      ) : null}
    </div>
  );
}
