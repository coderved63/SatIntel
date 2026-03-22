import Card from '../common/Card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

export default function TrendChart({ data }) {
  if (!data) return null;

  const { historical = {}, forecast = {}, trend_direction, parameter, model } = data;

  const historicalEntries = Object.entries(historical).map(([date, value]) => ({
    date,
    value: Number(value),
    type: 'historical',
  }));

  const forecastEntries = Object.entries(forecast).map(([date, value]) => ({
    date,
    forecast: Number(value),
    type: 'forecast',
  }));

  // Bridge: last historical point gets forecast value too
  if (historicalEntries.length > 0 && forecastEntries.length > 0) {
    const lastHist = historicalEntries[historicalEntries.length - 1];
    lastHist.forecast = lastHist.value;
  }

  const chartData = [...historicalEntries, ...forecastEntries];
  const tickInterval = Math.max(1, Math.floor(chartData.length / 12));

  const TrendIcon = trend_direction === 'increasing' ? TrendingUp : TrendingDown;
  const trendColor = trend_direction === 'increasing' ? 'text-red-400' : 'text-emerald-400';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Trend Prediction</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{model || 'ARIMA'} — {parameter}</p>
        </div>
        <div className={`flex items-center gap-2 ${trendColor}`}>
          <TrendIcon className="h-5 w-5" />
          <span className="text-sm font-medium capitalize">{trend_direction}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--chart-text)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            interval={tickInterval}
            tickFormatter={formatSmartLabel}
          />
          <YAxis tick={{ fill: 'var(--chart-text)', fontSize: 10 }} tickLine={false} axisLine={false} width={50} tickCount={5} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '8px',
              padding: '8px 12px',
              backdropFilter: 'blur(12px)',
            }}
            labelStyle={{ color: 'var(--tooltip-text)', fontSize: 11, marginBottom: 4 }}
            labelFormatter={formatTooltipDate}
          />
          <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3B82F6', stroke: 'var(--bg-secondary)', strokeWidth: 2 }} name="Historical" />
          <Line type="monotone" dataKey="forecast" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: '#F59E0B', stroke: 'var(--bg-secondary)', strokeWidth: 2 }} name="Forecast" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-blue-500" />
          Historical
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-amber-500 border-dashed" style={{ borderTop: '2px dashed #F59E0B' }} />
          Forecast
        </div>
      </div>
    </Card>
  );
}
