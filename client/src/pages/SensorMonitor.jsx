import { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Zap, Thermometer, Wind } from 'lucide-react';

function SensorStatCard({ icon: Icon, label, value, unit, color, min, max, avg, warnAt, critAt }) {
  const isWarn = value >= warnAt;
  const isCrit = value >= critAt;
  const c = isCrit ? 'var(--red)' : isWarn ? 'var(--amber)' : color;
  return (
    <div className="card animate-in">
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${c}12`, border: `1px solid ${c}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} color={c} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{label}</div>
            <span className={`badge ${isCrit ? 'badge-red' : isWarn ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 9, marginTop: 2 }}>
              {isCrit ? 'Critical' : isWarn ? 'Warning' : 'Normal'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 40, fontWeight: 900, fontFamily: 'var(--mono)', color: c, lineHeight: 1 }}>{value?.toFixed(1)}</span>
          <span style={{ fontSize: 16, color: 'var(--text-3)' }}>{unit}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['Min', min, unit], ['Avg', avg, unit], ['Max', max, unit]].map(([l, v, u]) => (
            <div key={l} style={{ textAlign: 'center', padding: 8, background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-4)', fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text-2)', marginTop: 2 }}>{v?.toFixed(1)}{u}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: c, transition: 'width 0.8s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: 'var(--text-4)' }}>
            <span>{min}{unit}</span>
            <span style={{ color: 'var(--amber)' }}>Warn: {warnAt}{unit}</span>
            <span>{max}{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SensorMonitor({ data, history }) {
  const [apiHistory, setApiHistory] = useState([]);
  useEffect(() => {
    fetch('/api/readings/history?limit=60').then(r => r.json()).then(d => d.success && setApiHistory(d.data)).catch(() => {});
  }, []);

  const src = apiHistory.length > 0 ? apiHistory : history;
  const chartData = src.map((h, i) => ({
    i,
    t: new Date(h.timestamp || Date.now() - (src.length - i) * 2000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    current: h.current, temperature: h.temperature, gas: h.gas,
  }));

  const stats = (key) => {
    const vals = chartData.map(d => d[key]).filter(Boolean);
    if (!vals.length) return { min: 0, max: 0, avg: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a,b) => a+b,0)/vals.length };
  };

  const cs = stats('current'); const ts = stats('temperature'); const gs = stats('gas');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sensor Monitor</h1>
          <p className="page-sub">Current · Temperature · Gas — Historical trends & threshold analysis</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <SensorStatCard icon={Zap} label="Current" value={data?.current ?? 0} unit="A" color="var(--blue)" min={0} max={20} avg={cs.avg} warnAt={10} critAt={15} />
        <SensorStatCard icon={Thermometer} label="Temperature" value={data?.temperature ?? 0} unit="°C" color="var(--amber)" min={0} max={100} avg={ts.avg} warnAt={55} critAt={65} />
        <SensorStatCard icon={Wind} label="Gas Level" value={data?.gas ?? 0} unit=" ppm" color="var(--green)" min={0} max={1000} avg={gs.avg} warnAt={250} critAt={500} />
      </div>

      {/* Combined chart */}
      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Temperature & Current History</div>
          <span className="badge badge-blue">{chartData.length} readings</span>
        </div>
        <div className="card-body">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-4)' }} interval="preserveStartEnd" />
                <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 10, fill: 'var(--text-4)' }} tickFormatter={v => `${v}°C`} />
                <YAxis yAxisId="curr" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-4)' }} tickFormatter={v => `${v}A`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                <ReferenceLine yAxisId="temp" y={55} stroke="var(--amber)" strokeDasharray="4 4" />
                <ReferenceLine yAxisId="temp" y={65} stroke="var(--red)" strokeDasharray="4 4" />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="var(--amber)" strokeWidth={2} dot={false} />
                <Line yAxisId="curr" type="monotone" dataKey="current" name="Current (A)" stroke="var(--blue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gas chart */}
      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Gas Emission History (MQ135)</div>
          <span className={`badge ${data?.gas > 500 ? 'badge-red' : data?.gas > 250 ? 'badge-amber' : 'badge-green'}`}>
            {data?.gas > 500 ? 'HIGH' : data?.gas > 250 ? 'ELEVATED' : 'NORMAL'}
          </span>
        </div>
        <div className="card-body">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-4)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)' }} tickFormatter={v => `${v}ppm`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v?.toFixed(0)}ppm`, 'Gas']} labelFormatter={() => ''} />
                <ReferenceLine y={250} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: '250ppm warn', position: 'insideTopRight', fontSize: 9, fill: 'var(--amber)' }} />
                <ReferenceLine y={500} stroke="var(--red)" strokeDasharray="4 4" label={{ value: '500ppm danger', position: 'insideTopRight', fontSize: 9, fill: 'var(--red)' }} />
                <defs><linearGradient id="gasG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--green)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--green)" stopOpacity={0}/></linearGradient></defs>
                <Area type="monotone" dataKey="gas" name="Gas (ppm)" stroke="var(--green)" strokeWidth={2} fill="url(#gasG)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
