import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Activity, ArrowRight, CalendarClock } from 'lucide-react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppLayout from './components/AppLayout';
import Households from './pages/Households';
import Patients from './pages/Patients';
import FieldVisit from './pages/FieldVisit';
import Landing from './pages/Landing';
import Registers from './pages/Registers';
import type { User } from './types';

function FollowUps() {
  type FollowUpRecord = { id: number; patient_id: number; patient: string; village: string; reason: string; due_date: string; status: string };
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get<FollowUpRecord[]>('/api/follow-ups')
      .then((response) => setFollowUps(response.data))
      .catch(() => setError('Could not load follow-ups. Check the API connection and try again.'));
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div><p className="dashboard-kicker">CONTINUITY OF CARE</p><h2>Follow-ups</h2><p>Keep track of the next step for every patient.</p></div>
      </div>
      {error && <p role="alert" className="dashboard-error">{error}</p>}
      {followUps.length ? <div className="follow-up-list">
        {followUps.map((followUp) => {
          const isOverdue = followUp.status === 'Pending' && followUp.due_date < new Date().toISOString().slice(0, 10);
          return (
            <article key={followUp.id} className="follow-up-row">
              <span className={`follow-up-date ${isOverdue ? 'is-overdue' : ''}`}><CalendarClock size={19} />{new Date(`${followUp.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <div className="follow-up-person"><strong>{followUp.patient}</strong><span>{followUp.village} · {followUp.reason}</span></div>
              <span className={`follow-up-status ${isOverdue ? 'is-overdue' : ''}`}>{isOverdue ? 'Overdue' : followUp.status}</span>
              <Link to={`/visit?patient=${followUp.patient_id}`} aria-label={`Open visit for ${followUp.patient}`}><ArrowRight size={17} /></Link>
            </article>
          );
        })}
      </div> : !error && <div className="follow-up-empty"><span><Activity size={22} /></span><h3>You’re all caught up.</h3><p>New patient follow-ups will appear here when they’re scheduled.</p></div>}
    </div>
  );
}

function AuthLoading() {
  return <div className="auth-loading" role="status" aria-label="Restoring workspace"><span /></div>;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData) as User);
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const handleLogin = (userData: User) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={!isAuthReady ? <AuthLoading /> : !isAuthenticated ? <Landing /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/login"
          element={!isAuthReady ? <AuthLoading /> : !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/"
          element={!isAuthReady ? <AuthLoading /> : isAuthenticated ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="households" element={<Households />} />
          <Route path="patients" element={<Patients />} />
          <Route path="visit" element={<FieldVisit />} />
          <Route path="registers" element={<Registers />} />
          <Route path="followups" element={<FollowUps />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
