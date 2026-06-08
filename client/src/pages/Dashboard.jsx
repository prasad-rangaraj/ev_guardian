import { useEffect, useState } from 'react';
import SafetyBanner from '../components/dashboard/SafetyBanner';
import BatteryHealthCard from '../components/dashboard/BatteryHealthCard';
import CellVoltageGrid from '../components/dashboard/CellVoltageGrid';
import SensorPanel from '../components/dashboard/SensorPanel';
import AIStatusCard from '../components/dashboard/AIStatusCard';
import ProtectionStatus from '../components/dashboard/ProtectionStatus';
import EventLog from '../components/dashboard/EventLog';
import DemoPanel from '../components/dashboard/DemoPanel';
import { Activity, Battery, Cpu, Brain } from 'lucide-react';

function MiniStat({ label, value, sub, color = 'var(--text)', icon: Icon }) {
  return (
    <div className="stat-card animate-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        {Icon && <Icon size={16} color={color} />}
      </div>
      <div className="stat-value" style={{ color, fontSize: 28 }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ data, history }) {
  const [faults, setFaults] = useState([]);

  useEffect(() => {
    fetch('/api/faults').then(r => r.json()).then(d => d.success && setFaults(d.data)).catch(() => {});
  }, []);

  const onScenarioChange = () => {
    setTimeout(() => {
      fetch('/api/faults').then(r => r.json()).then(d => d.success && setFaults(d.data)).catch(() => {});
    }, 500);
  };

  const statusColor = data?.status === 'Healthy' ? 'var(--green)' : data?.status === 'Warning' ? 'var(--amber)' : 'var(--red)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Safety Banner */}
      <SafetyBanner data={data} />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="stagger">
        <MiniStat label="Battery Health" value={`${data?.batteryHealth?.toFixed(1) ?? '--'}%`} sub="State of Health" color={statusColor} icon={Battery} />
        <MiniStat label="Pack Voltage" value={`${((data?.cell1 ?? 4) + (data?.cell2 ?? 4) + (data?.cell3 ?? 4) + (data?.cell4 ?? 4)).toFixed(2)}V`} sub="4S Li-ion" icon={Activity} />
        <MiniStat label="Temperature" value={`${data?.temperature?.toFixed(1) ?? '--'}°C`} sub={data?.temperature > 55 ? '⚠ High' : 'Normal'} color={data?.temperature > 55 ? 'var(--amber)' : 'var(--text)'} icon={Cpu} />
        <MiniStat label="AI Score" value={`${data?.anomalyScore?.toFixed(1) ?? '--'}%`} sub={data?.status ?? 'Healthy'} color={statusColor} icon={Brain} />
      </div>

      {/* Main 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <BatteryHealthCard data={data} history={history} />
        <AIStatusCard data={data} history={history} />
        <ProtectionStatus data={data} />
      </div>

      {/* Cell + Sensor */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <CellVoltageGrid data={data} history={history} />
        <SensorPanel data={data} history={history} />
      </div>

      {/* Log + Demo */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <EventLog faults={faults} data={data} />
        <DemoPanel onScenarioChange={onScenarioChange} />
      </div>
    </div>
  );
}
