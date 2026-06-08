import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, AlertCircle, CheckCircle, Trash2, RefreshCw, Filter } from 'lucide-react';

const SEV_COLOR = { Critical: 'var(--red)', Warning: 'var(--amber)', Healthy: 'var(--green)', Normal: 'var(--green)' };
const SEV_CLS   = { Critical: 'badge-red', Warning: 'badge-amber', Healthy: 'badge-green', Normal: 'badge-green' };
const PIE_COLORS = ['var(--green)', 'var(--amber)', 'var(--red)'];

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN');
}

export default function FaultReports() {
  const [faults, setFaults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/faults?limit=50').then(r => r.json()),
      fetch('/api/faults/summary').then(r => r.json()),
    ]).then(([f, s]) => {
      if (f.success) setFaults(f.data);
      if (s.success) setSummary(s.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clearAll = async () => {
    if (!window.confirm('Clear all fault logs?')) return;
    await fetch('/api/faults', { method: 'DELETE' });
    fetchData();
  };

  const filtered = faults.filter(f =>
    !filter || f.severity === filter || f.faultType.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">Fault Reports</h1><p className="page-sub">Complete fault history, severity breakdown & event management</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ gap: 5 }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearAll}><Trash2 size={13} /> Clear All</button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Events', value: faults.length, icon: AlertTriangle, color: 'var(--text)' },
          { label: 'Critical', value: faults.filter(f => f.severity === 'Critical').length, icon: AlertCircle, color: 'var(--red)' },
          { label: 'Warnings', value: faults.filter(f => f.severity === 'Warning').length, icon: AlertTriangle, color: 'var(--amber)' },
          { label: 'Normal', value: faults.filter(f => f.severity === 'Healthy' || f.severity === 'Normal').length, icon: CheckCircle, color: 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Pie chart */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Severity Distribution</div>
          </div>
          <div className="card-body">
            {summary?.bySeverity ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.bySeverity.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {summary.bySeverity.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Type bar chart */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Fault Type Breakdown</div>
          </div>
          <div className="card-body">
            {summary?.byType ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byType} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-4)' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-4)' }} width={60} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="var(--yellow)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}>No data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Fault table */}
      <div className="card">
        <div className="card-header">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Event History</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={13} color="var(--text-4)" />
            <select className="select" style={{ fontSize: 12, padding: '4px 8px' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Healthy">Normal</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Time</th><th>Fault Type</th><th>Severity</th><th>Action Taken</th><th>Value</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-4)', padding: 32 }}>
                  <CheckCircle size={24} color="var(--green)" style={{ display: 'block', margin: '0 auto 8px' }} />
                  No fault events recorded
                </td></tr>
              ) : filtered.map((f, i) => (
                <tr key={f.id ?? i}>
                  <td className="mono">{timeAgo(f.timestamp)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-2)' }}>{f.faultType}</td>
                  <td><span className={`badge ${SEV_CLS[f.severity] || 'badge-gray'}`}>{f.severity}</span></td>
                  <td style={{ color: 'var(--text-3)' }}>{f.actionTaken}</td>
                  <td className="mono" style={{ color: SEV_COLOR[f.severity] || 'var(--text-3)' }}>{f.value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer" style={{ fontSize: 11, color: 'var(--text-4)' }}>
          Showing {filtered.length} of {faults.length} events
        </div>
      </div>
    </div>
  );
}
