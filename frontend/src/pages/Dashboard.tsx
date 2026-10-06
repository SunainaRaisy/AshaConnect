import { useState, useEffect } from 'react';
import axios from 'axios';
import { Home, Users, ClipboardList, Activity, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../types';
import './Dashboard.css';

type DashboardStats = { households: number; patients: number; pending_validation: number; validated: number; follow_ups: number };
type VisitRecord = { id: string; register_type: string; date: string };

const emptyStats: DashboardStats = { households: 0, patients: 0, pending_validation: 0, validated: 0, follow_ups: 0 };
const registerTypes = [
  'Children 0-5 Years', 'Adolescents 9-19 Years', 'Newly Married Couples',
  'Pregnancy / Antenatal', 'Delivery / Postnatal', 'Immunization',
  'Family Planning', 'NHD', 'VHNC', 'NCD', 'Communicable Diseases',
  'Seasonal Diseases', 'National Programmes',
];

export default function Dashboard({ user }: { user: User | null }) {
  const [stats, setStats] = useState(emptyStats);
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsResponse, recordsResponse] = await Promise.all([
          axios.get<DashboardStats>('/api/dashboard/stats'),
          axios.get<VisitRecord[]>('/api/records'),
        ]);
        setStats(statsResponse.data);
        setRecords(recordsResponse.data);
      } catch {
        setError('Some workspace information could not be loaded. Refresh to try again.');
      }
    };
    void loadDashboard();
  }, []);

  const recordCounts = records.reduce<Record<string, number>>((counts, record) => {
    counts[record.register_type] = (counts[record.register_type] ?? 0) + 1;
    return counts;
  }, {});
  const registers = registerTypes
    .map((name) => ({ name, count: recordCounts[name] ?? 0 }))
    .filter((register) => register.count > 0)
    .sort((left, right) => right.count - left.count);
  const chartData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return {
      name: day.toLocaleDateString(undefined, { weekday: 'short' }),
      visits: records.filter((record) => record.date === key).length,
    };
  });
  const highestDailyCount = Math.max(1, ...chartData.map((day) => day.visits));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-kicker">YOUR COMMUNITY · TODAY</p>
          <h2>{greeting}, {user?.name?.split(' ')[0] ?? 'there'}.</h2>
          <p>Here’s the latest from your field work.</p>
        </div>
        <Link to="/visit" className="dashboard-action">
          <Activity size={18} /> Start a visit
        </Link>
      </div>

      {error && <p role="alert" className="dashboard-error">{error}</p>}

      <div className="dashboard-metrics">
        <div className="metric-tile" style={{ animationDelay: '40ms' }}>
          <div className="metric-icon metric-green"><Home size={21} /></div>
          <div>
            <p>Households</p>
            <strong>{stats.households}</strong>
          </div>
        </div>
        <div className="metric-tile" style={{ animationDelay: '100ms' }}>
          <div className="metric-icon metric-coral"><Users size={21} /></div>
          <div>
            <p>People registered</p>
            <strong>{stats.patients}</strong>
          </div>
        </div>
        <div className="metric-tile" style={{ animationDelay: '160ms' }}>
          <div className="metric-icon metric-amber"><ClipboardList size={21} /></div>
          <div>
            <p>Awaiting review</p>
            <strong>{stats.pending_validation}</strong>
          </div>
        </div>
        <div className="metric-tile" style={{ animationDelay: '220ms' }}>
          <div className="metric-icon metric-blue"><AlertTriangle size={21} /></div>
          <div>
            <p>Follow-ups due</p>
            <strong>{stats.follow_ups}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-panels">
        <section className="dashboard-panel register-panel">
          <div className="panel-heading"><div><p>RECORDS BY PROGRAMME</p><h3>Active registers</h3></div><Link to="/registers">View all <Activity size={15} /></Link></div>
          {registers.length > 0 ? <div className="register-list">
            {registers.map((register, index) => (
              <Link to={`/registers?type=${encodeURIComponent(register.name)}`} key={register.name} className="register-row" style={{ animationDelay: `${index * 45}ms` }}>
                <span>{register.name}</span><strong>{register.count}</strong><span className="register-track"><i style={{ width: `${Math.max(10, (register.count / registers[0].count) * 100)}%` }} /></span>
              </Link>
            ))}
          </div> : <div className="dashboard-empty"><ClipboardList size={22} /><p>Your register activity will appear here as records are added.</p><Link to="/visit">Start a visit</Link></div>}
        </section>

        <section className="dashboard-panel activity-panel">
          <div className="panel-heading"><div><p>FIELD ACTIVITY</p><h3>Last seven days</h3></div><span className="activity-mark"><Activity size={17} /></span></div>
          <div className="activity-chart" role="img" aria-label={chartData.map((day) => `${day.name}: ${day.visits} records`).join(', ')}>
            {chartData.map((day, index) => (
              <div className={`activity-day ${day.visits > 0 ? 'has-visits' : ''}`} key={day.name}>
                <span className="activity-count">{day.visits || ''}</span>
                <div className="activity-bar-track"><i style={{ height: `${Math.max(day.visits ? 10 : 2, day.visits / highestDailyCount * 100)}%`, animationDelay: `${index * 45}ms` }} /></div>
                <span className="activity-day-label">{day.name}</span>
              </div>
            ))}
          </div>
          <p className="chart-caption">Recorded household visits</p>
        </section>
      </div>
    </div>
  );
}
