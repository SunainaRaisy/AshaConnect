import { useState, type FormEvent } from 'react';
import { Activity, ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import type { User } from '../types';
import './Login.css';

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [healthId, setHealthId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/login', { health_id: healthId, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user as User);
    } catch (err) {
      setError('We could not sign you in. Check your health ID and password, then try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <Link to="/" className="login-brand"><span><Activity size={19} /></span> asha<span>connect</span></Link>
        <div className="login-story-copy">
          <p>COMMUNITY CARE, CONNECTED</p>
          <h1 aria-label="Every visit moves care forward.">Every visit<br />moves care<br /><em>forward.</em></h1>
          <span>One clear picture for every household, every patient, every next step.</span>
        </div>
        <span className="login-story-credit">FIELD WORKSPACE · ASHA CONNECT</span>
      </section>
      <section className="login-access">
        <Link to="/" className="login-back"><ArrowLeft size={16} /> Back to home</Link>
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><span><Activity size={19} /></span> asha<span>connect</span></div>
          <p className="login-kicker">HEALTH WORKER ACCESS</p>
          <h2>Welcome back.</h2>
          <p className="login-intro">Sign in to your community health workspace.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="healthId">Health ID number
              <input id="healthId" name="healthId" type="text" required autoComplete="username" value={healthId} onChange={(event) => setHealthId(event.target.value)} placeholder="Enter your health ID" />
            </label>
            <label htmlFor="password">Password
              <input id="password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
            </label>
            {error && <p role="alert" className="login-error">{error}</p>}
            <button type="submit" disabled={loading} className="login-submit">{loading ? 'Signing in...' : 'Sign in'} <ArrowRight size={17} /></button>
          </form>
          <p className="login-assurance"><LockKeyhole size={14} /> Your workspace is for authorized health workers.</p>
        </div>
        <span className="login-access-footer">ASHA CONNECT <span>·</span> COMMUNITY HEALTH</span>
      </section>
    </main>
  );
}
