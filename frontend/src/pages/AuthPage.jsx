import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();

  const { login, verifyLogin, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [step, setStep] = useState('credentials');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const getError = err =>
    err.response?.data?.message ||
    err.message ||
    'Something went wrong. Please try again.';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      if (isRegister) {
        // Register a new customer
        await register(name, email, password);
        navigate('/login');

      } else if (step === 'credentials') {
        // Check email and password
        const result = await login(email, password);

        if (result.requiresVerification) {
          // Test account: show OTP verification
          setStep('verify');
          setMessage(
            'A 4-digit verification code has been sent to your email.'
          );
        } else {
          // Normal customer: login successful
          navigate('/');
        }

      } else {
        // Verify the 4-digit OTP
        await verifyLogin(email, code);
        navigate('/');
      }

    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  }

  const isVerify = !isRegister && step === 'verify';

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>

        <p className="eyebrow">
          WELCOME TO EARTHGLOW
        </p>

        <h1>
          {isRegister
            ? 'Create your account'
            : isVerify
              ? 'Verify your email'
              : 'Welcome back'}
        </h1>

        <p className="muted">
          {isVerify
            ? 'Enter the 4-digit code sent to your email.'
            : 'Your everyday essentials are waiting.'}
        </p>

        {isVerify ? (
          <>
            <p className="muted">
              Verification email:{' '}
              <strong>{email}</strong>
            </p>

            <label>
              4-digit verification code

              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="Enter 4-digit code"
                value={code}
                onChange={e =>
                  setCode(
                    e.target.value.replace(/\D/g, '')
                  )
                }
              />
            </label>

            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setStep('credentials');
                setCode('');
                setError('');
                setMessage('');
              }}
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            {isRegister && (
              <label>
                Full name

                <input
                  required
                  value={name}
                  onChange={e =>
                    setName(e.target.value)
                  }
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              Email address

              <input
                required
                type="email"
                value={email}
                onChange={e =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
              />
            </label>

            <label>
              Password

              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={e =>
                  setPassword(e.target.value)
                }
                autoComplete={
                  isRegister
                    ? 'new-password'
                    : 'current-password'
                }
              />
            </label>

            {!isRegister && (
              <p className="auth-switch">
                <Link to="/forgot-password">
                  Forgot password?
                </Link>
              </p>
            )}
          </>
        )}

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            className="muted"
            role="status"
          >
            {message}
          </p>
        )}

        <button
          className="button button-full"
          type="submit"
          disabled={busy}
        >
          {busy
            ? 'Please wait…'
            : isRegister
              ? 'Create account'
              : isVerify
                ? 'Verify & Sign in'
                : 'Sign in'}
        </button>

        {!isVerify && (
          <p className="auth-switch">
            {isRegister
              ? 'Already have an account?'
              : 'New to EarthGlow?'}{' '}

            <Link
              to={
                isRegister
                  ? '/login'
                  : '/register'
              }
            >
              {isRegister
                ? 'Sign in'
                : 'Create an account'}
            </Link>
          </p>
        )}

      </form>
    </main>
  );
}