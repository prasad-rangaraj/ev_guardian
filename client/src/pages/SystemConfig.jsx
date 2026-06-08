import { useState } from 'react';
import { Settings, Save, RotateCcw, Power, Bell } from 'lucide-react';

const DEFAULT = {
  cellMin: 3.6, cellMax: 4.2, tempWarn: 55, tempCrit: 65,
  currentWarn: 10, currentCrit: 15, gasWarn: 250, gasCrit: 500,
  mqttTopic: 'battery/live', updateInterval: 2,
};

export default function SystemConfig({ data }) {
  const [cfg, setCfg] = useState(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [relayLoading, setRelayLoading] = useState(false);

  const update = (k, v) => setCfg(prev => ({ ...prev, [k]: v }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const manualRelay = async (action) => {
    setRelayLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setRelayLoading(false);
    alert(`Relay ${action} command sent`);
  };

  const SliderRow = ({ label, stateKey, min, max, step = 1, unit, color = 'var(--yellow)' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color }}>{cfg[stateKey]}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={cfg[stateKey]}
        onChange={e => update(stateKey, parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );

  const relayOn = data?.relay === 'CONNECTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div><h1 className="page-title">System Config</h1><p className="page-sub">Thresholds, relay control & MQTT configuration</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCfg(DEFAULT)}><RotateCcw size={13} /> Reset</button>
          <button className="btn btn-primary btn-sm" onClick={save}><Save size={13} />{saved ? 'Saved!' : 'Save Config'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Cell thresholds */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Cell Voltage Thresholds</div>
            <span className="badge badge-yellow">V</span>
          </div>
          <div className="card-body">
            <SliderRow label="Min Cell Voltage (Discharge cutoff)" stateKey="cellMin" min={3.0} max={3.8} step={0.05} unit="V" />
            <SliderRow label="Max Cell Voltage (Overcharge cutoff)" stateKey="cellMax" min={4.0} max={4.5} step={0.05} unit="V" />
          </div>
        </div>

        {/* Temperature thresholds */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Temperature Thresholds</div>
            <span className="badge badge-amber">°C</span>
          </div>
          <div className="card-body">
            <SliderRow label="Warning Threshold" stateKey="tempWarn" min={40} max={70} unit="°C" color="var(--amber)" />
            <SliderRow label="Critical Threshold" stateKey="tempCrit" min={50} max={90} unit="°C" color="var(--red)" />
          </div>
        </div>

        {/* Current thresholds */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Current Thresholds</div>
            <span className="badge badge-blue">A</span>
          </div>
          <div className="card-body">
            <SliderRow label="Warning Threshold" stateKey="currentWarn" min={5} max={20} unit="A" color="var(--amber)" />
            <SliderRow label="Critical Threshold" stateKey="currentCrit" min={10} max={30} unit="A" color="var(--red)" />
          </div>
        </div>

        {/* Gas thresholds */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Gas Emission Thresholds</div>
            <span className="badge badge-green">ppm</span>
          </div>
          <div className="card-body">
            <SliderRow label="Warning Threshold" stateKey="gasWarn" min={100} max={400} step={10} unit=" ppm" color="var(--amber)" />
            <SliderRow label="Critical Threshold" stateKey="gasCrit" min={300} max={900} step={10} unit=" ppm" color="var(--red)" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Relay control */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Power size={15} color="var(--yellow)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Manual Relay Control</span>
            </div>
            <span className={`badge ${relayOn ? 'badge-green' : 'badge-red'}`}>{data?.relay ?? 'UNKNOWN'}</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 14px', background: relayOn ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${relayOn ? 'var(--green-border)' : 'var(--red-border)'}`, borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: relayOn ? 'var(--green)' : 'var(--red)' }}>
                {relayOn ? '● Battery Pack Connected' : '● Battery Pack Isolated'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {relayOn ? 'Load connection active' : 'Protection mode — pack disconnected'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} disabled={relayLoading} onClick={() => manualRelay('CONNECT')}>
                <Power size={14} color="var(--green)" /> Connect
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} disabled={relayLoading} onClick={() => manualRelay('DISCONNECT')}>
                <Power size={14} /> Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* MQTT config */}
        <div className="card">
          <div className="card-header">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>MQTT Configuration</div>
            <span className="badge badge-blue">IoT</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Broker URL', value: 'mqtt://localhost:1883', readonly: true },
              { label: 'Topic', key: 'mqttTopic' },
              { label: 'QoS Level', value: '0 (At most once)', readonly: true },
              { label: 'Client ID', value: 'think360-edge-server', readonly: true },
            ].map(({ label, value, key, readonly }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <input
                  className="input"
                  value={key ? cfg[key] : value}
                  onChange={key ? e => update(key, e.target.value) : undefined}
                  readOnly={readonly}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12, background: readonly ? 'var(--surface-2)' : 'var(--surface)' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Update Interval</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min={1} max={10} value={cfg.updateInterval} onChange={e => update('updateInterval', parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--yellow)' }} />
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--yellow)', minWidth: 32 }}>{cfg.updateInterval}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
