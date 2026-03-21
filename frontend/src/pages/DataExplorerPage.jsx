import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { satelliteService } from '../services/satelliteService';
import { Database, Satellite } from 'lucide-react';

export default function DataExplorerPage() {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    satelliteService.getParameters().then(setParameters).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Explorer</h1>
          <p className="text-slate-400 text-sm mt-1">Browse available satellite data parameters</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {parameters.map(param => (
            <Card key={param.id} className="hover:border-slate-600 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${param.color}15` }}>
                  <Satellite className="h-6 w-6" style={{ color: param.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{param.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{param.description}</p>
                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span>Source: {param.source}</span>
                    <span>Resolution: {param.resolution}</span>
                    <span>Frequency: {param.frequency}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
