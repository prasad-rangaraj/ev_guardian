import { useState, useEffect } from 'react';
import { Download, Database, Server, Clock } from 'lucide-react';

export default function LiveStream({ data, history, terminalLogs = [] }) {

  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = () => {
      fetch('/api/system/health').then(r => r.json()).then(d => d.success && setHealth(d.data)).catch(() => {});
      fetch('/api/system/stats').then(r => r.json()).then(d => d.success && setStats(d.data)).catch(() => {});
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await fetch('/api/system/export?format=csv&limit=200');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `think360_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const lastReading = history[history.length - 1] || data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">Live Stream</h1><p className="page-sub">Real-time data stream, system health & CSV export</p></div>
        <button className="btn btn-primary" onClick={exportCSV} disabled={exporting}>
          <Download size={14} />{exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Server', value: health?.server ?? '...', icon: Server, color: health?.server === 'online' ? 'var(--green)' : 'var(--red)' },
          { label: 'Database', value: health?.db ?? '...', icon: Database, color: health?.db === 'connected' ? 'var(--green)' : 'var(--red)' },
          { label: 'DB Latency', value: health?.dbLatency ?? '--', icon: Clock, color: 'var(--blue)' },
          { label: 'Uptime', value: health ? `${Math.floor(health.uptime/60)}m ${health.uptime%60}s` : '--', icon: Clock, color: 'var(--text)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span><Icon size={15} color={color} />
            </div>
            <div className="stat-value" style={{ color, fontSize: 18, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[['Total Readings', stats.totalReadings, 'var(--blue)'], ['Total Faults', stats.totalFaults, 'var(--amber)'], ['Anomaly Logs', stats.totalAnomalies, 'var(--purple)']].map(([l, v, c]) => (
            <div key={l} className="stat-card animate-in">
              <div className="stat-label">{l}</div>
              <div className="stat-value" style={{ color: c, fontSize: 28 }}>{v?.toLocaleString()}</div>
              <div className="stat-sub">PostgreSQL</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Live MQTT Payload */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'dot-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Live MQTT Payload</span>
            </div>
            <span className="badge badge-green">topic: battery/live</span>
          </div>
          <div className="card-body">
            <pre style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-2)', overflowX: 'auto', height: 260 }}>
{JSON.stringify({ cell1: lastReading?.cell1 ? parseFloat(lastReading.cell1.toFixed(3)) : null, cell2: lastReading?.cell2 ? parseFloat(lastReading.cell2.toFixed(3)) : null, cell3: lastReading?.cell3 ? parseFloat(lastReading.cell3.toFixed(3)) : null, cell4: lastReading?.cell4 ? parseFloat(lastReading.cell4.toFixed(3)) : null, current: lastReading?.current ? parseFloat(lastReading.current.toFixed(2)) : null, temperature: lastReading?.temperature ? parseFloat(lastReading.temperature.toFixed(1)) : null, gas: lastReading?.gas ? Math.round(lastReading.gas) : null, batteryHealth: lastReading?.batteryHealth ? parseFloat(lastReading.batteryHealth.toFixed(1)) : null, anomalyScore: lastReading?.anomalyScore ? parseFloat(lastReading.anomalyScore.toFixed(1)) : null, status: lastReading?.status, relay: lastReading?.relay }, null, 2)}
            </pre>
          </div>
        </div>

        {/* Live Serial Console */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', animation: 'dot-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Live Hardware Serial Console</span>
            </div>
            <span className="badge badge-blue">topic: battery/terminal</span>
          </div>
          <div className="card-body">
            <div style={{ background: '#0b0f19', border: '1px solid #1a2236', borderRadius: 8, padding: 16, fontFamily: 'var(--mono)', fontSize: 11, color: '#38ef7d', overflowY: 'auto', height: 260, display: 'flex', flexDirection: 'column-reverse' }}>
              <div>
                {terminalLogs && terminalLogs.length > 0 ? (
                  [...terminalLogs].reverse().map((log) => (
                    <div key={log.id} style={{ marginBottom: 4, wordBreak: 'break-all' }}>
                      <span style={{ color: 'var(--text-4)', marginRight: 8 }}>[{log.timestamp}]</span>
                      {log.text}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-4)', fontStyle: 'italic', textAlign: 'center', marginTop: 100 }}>
                    Waiting for hardware logs...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Rolling Data Stream</div>
          <span className="badge badge-blue">{history.length} readings</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>#</th><th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>Current</th><th>Temp</th><th>Gas</th><th>Health</th><th>Score</th><th>Status</th></tr></thead>
            <tbody>
              {[...history].reverse().slice(0, 20).map((h, i) => (
                <tr key={i}>
                  <td className="mono" style={{ color: 'var(--text-4)' }}>{history.length - i}</td>
                  <td className="mono">{h.cell1?.toFixed(3)}V</td>
                  <td className="mono">{h.cell2?.toFixed(3)}V</td>
                  <td className="mono" style={{ color: h.cell3 < 3.6 ? 'var(--red)' : 'inherit' }}>{h.cell3?.toFixed(3)}V</td>
                  <td className="mono">{h.cell4?.toFixed(3)}V</td>
                  <td className="mono">{h.current?.toFixed(2)}A</td>
                  <td className="mono" style={{ color: h.temperature > 55 ? 'var(--amber)' : 'inherit' }}>{h.temperature?.toFixed(1)}°C</td>
                  <td className="mono">{Math.round(h.gas)}ppm</td>
                  <td className="mono">{h.batteryHealth?.toFixed(1)}%</td>
                  <td className="mono" style={{ color: h.anomalyScore > 20 ? 'var(--amber)' : 'inherit' }}>{h.anomalyScore?.toFixed(1)}%</td>
                  <td><span className={`badge ${h.status === 'Healthy' ? 'badge-green' : h.status === 'Warning' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 9 }}>{h.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer" style={{ fontSize: 11, color: 'var(--text-4)' }}>Showing last 20 readings · topic: battery/live</div>
      </div>
    </div>
  );
}
