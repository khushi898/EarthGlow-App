import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Invalid password-reset link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const result = await resetPassword(token, password);

      setSuccess(true);
      setMessage(
        result.message || 'Password updated successfully.'
      );

      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to reset password. The link may have expired.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">WELCOME TO EARTHGLOW</p>

        <h1>
          {success ? 'Password updated!' : 'Create new password'}
        </h1>

        <p className="muted">
          {success
            ? 'Your password has been changed successfully.'
            : 'Enter and confirm your new password.'}
        </p>

        {!success && (
          <>
            <label>
              New password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </label>
          </>
        )}

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

        {!success && (
          <button
            type="submit"
            className="button button-full"
            disabled={busy || !token}
          >
            {busy ? 'Updating password…' : 'Reset Password'}
          </button>
        )}

        <p className="auth-switch">
          <Link to="/login">
            {success ? 'Sign in with new password' : 'Back to login'}
          </Link>
        </p>
      </form>
    </main>
  );
}