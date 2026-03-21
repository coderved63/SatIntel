import Card from '../common/Card';

export default function StatsCard({ title, value, icon: Icon, color = 'cyan', subtitle, trend }) {
  const colorMap = {
    red: 'text-red-400 bg-red-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };

  const [textColor, bgColor] = (colorMap[color] || colorMap.cyan).split(' ');

  return (
    <Card padding="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className="text-xs text-amber-400 mt-1">{trend}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
        )}
      </div>
    </Card>
  );
}
