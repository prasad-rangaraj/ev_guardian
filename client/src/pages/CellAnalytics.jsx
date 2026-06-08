import { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Battery, TrendingUp, TrendingDown } from 'lucide-react';

const CELL_COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--purple)'];

function CellStatCard({ cell, voltage, min, max, avg, trend }) {
  const isOk = voltage >= 3.7 && voltage <= 4.2;
  const color = voltage < 3.6 || voltage > 4.2 ? 'var(--red)' : voltage < 3.7 ? 'var(--amber)' : 'var(--green)';
  return (
    <div className="card animate-in">
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color, fontFamily: 'var(--mono)' }}>
              {cell}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>Cell {cell.replace('C','')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-4)' }}>Li-ion Cell</div>
            </div>
          </div>
          {trend > 0 ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--red)" />}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--mono)', color, lineHeight: 1 }}>{voltage?.toFixed(3)}</span>
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}>V</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['Min', min], ['Avg', avg], ['Max', max]].map(([l, v]) => (
            <div key={l} style={{ textAlign: 'center', padding: '6px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-4)', fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text-2)', marginTop: 1 }}>{v?.toFixed(3)}V</div>
            </div>
          ))}
        </div>

        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100))}%`, background: color, transition: 'width 0.8s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
            <span>3.0V</span><span>3.7V nominal</span><span>4.2V</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CellAnalytics({ data, history }) {
  const [apiHistory, setApiHistory] = useState([]);
  useEffect(() => {
    fetch('/api/readings/history?limit=60').then(r => r.json()).then(d => d.success && setApiHistory(d.data)).catch(() => {});
  }, []);

  const chartData = (apiHistory.length > 0 ? apiHistory : history).map((h, i) => ({
    i,
    t: new Date(h.timestamp || Date.now() - (history.length - i) * 2000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    c1: h.cell1, c2: h.cell2, c3: h.cell3, c4: h.cell4,
  }));

  const voltages = [data?.cell1, data?.cell2, data?.cell3, data?.cell4].map(v => v ?? 4.0);
  const spread = (Math.max(...voltages) - Math.min(...voltages)).toFixed(3);

  const cellStats = voltages.map((v, i) => {
    const vals = chartData.map(d => d[`c${i+1}`]).filter(Boolean);
    const min = vals.length ? Math.min(...vals) : v;
    const max = vals.length ? Math.max(...vals) : v;
    const avg = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : v;
    const prev = chartData.length >= 2 ? chartData[chartData.length-2][`c${i+1}`] : v;
    return { min, max, avg, trend: v - prev };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cell Analytics</h1>
          <p className="page-sub">Individual cell voltage deep dive — 4S Li-ion Pack</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="card" style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Pack Voltage</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18, color: 'var(--yellow)' }}>{voltages.reduce((a,b) => a+b, 0).toFixed(2)}V</span>
          </div>
          <div className="card" style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Max Spread</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18, color: parseFloat(spread) > 0.15 ? 'var(--red)' : 'var(--green)' }}>{spread}V</span>
          </div>
        </div>
      </div>

      {/* 4 cell stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {['C1','C2','C3','C4'].map((cell, i) => (
          <CellStatCard key={cell} cell={cell} voltage={voltages[i]} {...cellStats[i]} />
        ))}
      </div>

      {/* Voltage history chart */}
      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Voltage History — All Cells</div>
          <span className="badge badge-blue">{chartData.length} readings</span>
        </div>
        <div className="card-body">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-4)' }} interval="preserveStartEnd" />
                <YAxis domain={[3.5, 4.3]} tick={{ fontSize: 10, fill: 'var(--text-4)' }} tickFormatter={v => `${v}V`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [`${v?.toFixed(3)}V`, n]} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                <ReferenceLine y={3.7} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: '3.7V min', position: 'insideTopRight', fontSize: 9, fill: 'var(--amber)' }} />
                <ReferenceLine y={4.2} stroke="var(--red)" strokeDasharray="4 4" label={{ value: '4.2V max', position: 'insideBottomRight', fontSize: 9, fill: 'var(--red)' }} />
                <Line type="monotone" dataKey="c1" name="Cell 1" stroke={CELL_COLORS[0]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="c2" name="Cell 2" stroke={CELL_COLORS[1]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="c3" name="Cell 3" stroke={CELL_COLORS[2]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="c4" name="Cell 4" stroke={CELL_COLORS[3]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cell balance heatmap */}
      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Balance Heatmap</div>
          <span className={`badge ${parseFloat(spread) > 0.15 ? 'badge-red' : 'badge-green'}`}>
            {parseFloat(spread) > 0.15 ? '⚠ Imbalanced' : '✓ Balanced'}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {voltages.map((v, i) => {
              const pct = Math.max(0, Math.min(100, ((v - 3.5) / 0.9) * 100));
              const color = v < 3.6 ? 'var(--red)' : v < 3.7 ? 'var(--amber)' : 'var(--green)';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>Cell {i+1}</div>
                  <div style={{
                    width: '100%', height: 120, background: 'var(--surface-3)', borderRadius: 8, border: '1px solid var(--border)',
                    position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
                  }}>
                    <div style={{ width: '100%', height: `${pct}%`, background: color, transition: 'height 1s ease', borderRadius: '0 0 7px 7px' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 800, color: pct > 50 ? '#fff' : color }}>{v?.toFixed(3)}V</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{pct.toFixed(0)}% charged</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
