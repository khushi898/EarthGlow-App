import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      const result = await forgotPassword(email);

      setMessage(
        result.message ||
        'If the account exists, a reset link will be sent.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to process your request. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">WELCOME TO EARTHGLOW</p>

        <h1>Forgot your password?</h1>

        <p className="muted">
          Enter your registered email address and
          we'll send you a link to reset your password.
        </p>

        <label>
          Email address
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="muted" role="status">
            {message}
          </p>
        )}

        <button
          type="submit"
          className="button button-full"
          disabled={busy}
        >
          {busy ? 'Please wait…' : 'Send Reset Link'}
        </button>

        <p className="auth-switch">
          Remember your password?{' '}
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </main>
  );
}