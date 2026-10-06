import { Activity, ArrowDown, ArrowRight, AudioLines, Check, ClipboardCheck, HeartHandshake, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="ASHA Connect home">
          <span className="brand-mark"><Activity size={20} strokeWidth={2.5} /></span>
          <span>asha<span className="brand-light">connect</span></span>
        </Link>
        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#for-workers">For health workers</a>
        </nav>
        <Link to="/login" className="nav-login">Sign in <ArrowRight size={16} /></Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-content">
            <p className="hero-eyebrow"><span /> COMMUNITY HEALTH, CONNECTED</p>
            <h1 aria-label="More care. Less paperwork.">More care.<br />Less <em>paperwork.</em></h1>
            <p className="hero-copy">One thoughtful tool for the people who keep a community well. Spend less time on forms and more time with families.</p>
            <div className="hero-actions">
              <Link to="/login" className="hero-cta">Open your workspace <ArrowRight size={18} /></Link>
              <a href="#how-it-works" className="hero-secondary">See how it works <ArrowDown size={16} /></a>
            </div>
            <div className="hero-note"><ShieldCheck size={17} /> Built around the ASHA field workflow</div>
          </div>
          <div className="hero-caption"><span>CARE THAT GOES THE LAST MILE</span><span>ASHA CONNECT</span></div>
        </section>

        <section className="impact-strip" aria-label="Platform benefits">
          <p>Designed for the work that matters</p>
          <div><strong>01</strong><span>Visit once</span></div>
          <div><strong>02</strong><span>Record once</span></div>
          <div><strong>03</strong><span>Follow through</span></div>
          <HeartHandshake className="impact-icon" size={34} strokeWidth={1.4} />
        </section>

        <section className="workflow-section" id="how-it-works">
          <div className="section-heading">
            <p className="section-kicker">A simpler way to work</p>
            <h2>One visit can do<br />a lot more.</h2>
            <p>From a doorstep conversation to a dependable health record, keep the whole picture connected.</p>
          </div>
          <div className="workflow-list">
            <article className="workflow-item">
              <span className="workflow-icon coral"><AudioLines size={23} /></span>
              <div><span className="workflow-number">01 / CAPTURE</span><h3>Be present, not buried in forms.</h3><p>Record the details of a household visit in one clear digital flow.</p></div>
              <ArrowRight className="workflow-arrow" size={19} />
            </article>
            <article className="workflow-item">
              <span className="workflow-icon green"><ClipboardCheck size={23} /></span>
              <div><span className="workflow-number">02 / ORGANIZE</span><h3>Every detail finds its place.</h3><p>Keep household and patient information together across essential registers.</p></div>
              <ArrowRight className="workflow-arrow" size={19} />
            </article>
            <article className="workflow-item" id="for-workers">
              <span className="workflow-icon yellow"><UsersRound size={23} /></span>
              <div><span className="workflow-number">03 / FOLLOW THROUGH</span><h3>Make the next step easier.</h3><p>See follow-ups and share records with ANMs for a connected care team.</p></div>
              <ArrowRight className="workflow-arrow" size={19} />
            </article>
          </div>
        </section>

        <section className="closing-band">
          <div className="closing-icon"><Check size={22} /></div>
          <p>Less time repeating the work.<br /><strong>More time making a difference.</strong></p>
          <Link to="/login" className="closing-link">Sign in to continue <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Link to="/" className="landing-brand"><span className="brand-mark"><Activity size={18} strokeWidth={2.5} /></span><span>asha<span className="brand-light">connect</span></span></Link>
        <p>Care, connected from the community up.</p>
        <span>COMMUNITY HEALTH WORKSPACE</span>
      </footer>
    </div>
  );
}
