import Card from '../common/Card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function TrendChart({ data }) {
  if (!data) return null;

  const { historical = {}, forecast = {}, trend_direction, parameter, model } = data;

  // Combine historical + forecast for chart
  const historicalEntries = Object.entries(historical).map(([date, value]) => ({
    date: date.substring(5),
    fullDate: date,
    value: Number(value),
    type: 'historical',
  }));

  const forecastEntries = Object.entries(forecast).map(([date, value]) => ({
    date: date.substring(5),
    fullDate: date,
    forecast: Number(value),
    type: 'forecast',
  }));

  // Bridge: last historical point gets forecast value too
  if (historicalEntries.length > 0 && forecastEntries.length > 0) {
    const lastHist = historicalEntries[historicalEntries.length - 1];
    lastHist.forecast = lastHist.value;
  }

  const chartData = [...historicalEntries, ...forecastEntries];

  const TrendIcon = trend_direction === 'increasing' ? TrendingUp : TrendingDown;
  const trendColor = trend_direction === 'increasing' ? 'text-red-400' : 'text-emerald-400';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Trend Prediction</h3>
          <p className="text-sm text-slate-400">{model || 'ARIMA'} — {parameter}</p>
        </div>
        <div className={`flex items-center gap-2 ${trendColor}`}>
          <TrendIcon className="h-5 w-5" />
          <span className="text-sm font-medium capitalize">{trend_direction}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
            labelStyle={{ color: '#94A3B8' }}
          />
          <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={2} dot={false} name="Historical" />
          <Line type="monotone" dataKey="forecast" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-cyan-500" />
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
