import React,{ useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { if (isRegister) await register(name, email, password); else await login(email, password); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">WELCOME TO EARTHGLOW</p><h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1><p className="muted">Your everyday essentials are waiting.</p>
    {isRegister && <label>Full name<input required value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>}
    <label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
    <label>Password<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="button button-full" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
    <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to EarthGlow?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
  </form></main>;
}
