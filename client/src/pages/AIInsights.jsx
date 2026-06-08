import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Brain, Activity, Cpu, Zap } from 'lucide-react';

export default function AIInsights({ data, history }) {
  const [trend, setTrend]   = useState([]);
  const [dist, setDist]     = useState([]);

  useEffect(() => {
    fetch('/api/anomalies/trend?limit=60').then(r => r.json()).then(d => d.success && setTrend(d.data)).catch(() => {});
    fetch('/api/anomalies/distribution').then(r => r.json()).then(d => d.success && setDist(d.data)).catch(() => {});
  }, []);

  const score = data?.anomalyScore ?? 0;
  const status = data?.status ?? 'Healthy';
  const statusColor = status === 'Healthy' ? 'var(--green)' : status === 'Warning' ? 'var(--amber)' : 'var(--red)';

  const trendData = trend.length > 0
    ? trend.map(r => ({ t: new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), score: r.anomalyScore, health: r.batteryHealth, status: r.status }))
    : history.map((h, i) => ({ t: i, score: h.anomalyScore ?? 0, health: h.batteryHealth ?? 0, status: h.status }));

  const distColor = (range) => {
    if (range === '0-10') return 'var(--green)';
    if (range === '10-25') return 'var(--blue)';
    if (range === '25-50') return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">AI Insights</h1><p className="page-sub">TinyML anomaly detection analytics — TensorFlow Lite Micro on STM32</p></div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Current Score', value: `${score.toFixed(1)}%`, color: statusColor, icon: Brain, sub: status },
          { label: 'AI Status', value: status, color: statusColor, icon: Activity, sub: 'TinyML prediction' },
          { label: 'Model', value: 'TFLite', color: 'var(--purple)', icon: Cpu, sub: 'TensorFlow Lite Micro' },
          { label: 'Inference', value: '< 10ms', color: 'var(--green)', icon: Zap, sub: 'Edge latency' },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="stat-card animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div className="stat-value" style={{ color, fontSize: 26 }}>{value}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Anomaly score trend */}
      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Anomaly Score Timeline</div>
          <span className={`badge ${status === 'Healthy' ? 'badge-green' : status === 'Warning' ? 'badge-amber' : 'badge-red'}`}>{status}</span>
        </div>
        <div className="card-body">
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-4)' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-4)' }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v?.toFixed(1)}%`, 'Score']} labelFormatter={() => ''} />
                <ReferenceLine y={20} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: 'Warn 20%', position: 'insideTopRight', fontSize: 9, fill: 'var(--amber)' }} />
                <ReferenceLine y={50} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'Critical 50%', position: 'insideTopRight', fontSize: 9, fill: 'var(--red)' }} />
                <defs><linearGradient id="aiArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--purple)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--purple)" stopOpacity={0}/></linearGradient></defs>
                <Area type="monotone" dataKey="score" stroke="var(--purple)" strokeWidth={2} fill="url(#aiArea)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Score distribution */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Score Distribution</div>
            <span className="badge badge-purple">Histogram</span>
          </div>
          <div className="card-body">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {dist.map((entry, index) => <Cell key={index} fill={distColor(entry.range)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Model info */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>TinyML Model Info</div>
            <span className="badge badge-green">Deployed</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Framework', 'TensorFlow Lite Micro'],
              ['Platform', 'STM32 Microcontroller'],
              ['Input Features', '7 (V1–V4, I, T, Gas)'],
              ['Output Classes', '3 (Healthy/Warning/Critical)'],
              ['Inference Time', '< 10ms on-device'],
              ['Communication', 'MQTT → Express → DB'],
              ['Update Cycle', 'Every 2 seconds'],
              ['Architecture', 'Dense Neural Network'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
