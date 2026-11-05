import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  api,
  createUser,
  PASSWORD,
  signIn,
  useTestDatabase
} from './helpers.js';
import User from '../src/models/User.js';
import {
  sendLoginOtp,
  sendPasswordResetEmail
} from '../src/utils/emailService.js';

// No real emails: capture what would have been sent.
vi.mock('../src/utils/emailService.js', () => ({
  sendLoginOtp: vi.fn(),
  sendPasswordResetEmail: vi.fn()
}));

useTestDatabase();

beforeEach(() => {
  vi.clearAllMocks();
});

const register = body => api.post('/api/auth/register').send(body);
const login = (email, password = PASSWORD) =>
  api.post('/api/auth/login').send({ email, password });
const tokenFromEmail = () =>
  sendPasswordResetEmail.mock.calls.at(-1)[1].split('token=')[1];
const enableTestMode = email => {
  process.env.EMAIL_TEST_MODE = 'true';
  process.env.EMAIL_TEST_TO = email;
};

describe('registering', () => {
  it('creates a customer and stores only a password hash', async () => {
    const res = await register({ name: 'Ann', email: 'Ann@Test.dev', password: PASSWORD });

    expect(res.status).toBe(201);
    const saved = await User.findOne({ email: 'ann@test.dev' });
    expect(saved.role).toBe('customer');
    expect(saved.passwordHash).not.toContain(PASSWORD);
  });

  it('cannot be used to make yourself an admin', async () => {
    await register({ name: 'Ann', email: 'ann@test.dev', password: PASSWORD, role: 'admin' });

    expect((await User.findOne({ email: 'ann@test.dev' })).role).toBe('customer');
  });

  it.each([
    ['an invalid email', { name: 'Ann', email: 'not-an-email', password: PASSWORD }],
    ['a short password', { name: 'Ann', email: 'ann@test.dev', password: 'short' }],
    ['a password over 72 bytes', { name: 'Ann', email: 'ann@test.dev', password: 'a'.repeat(73) }],
    ['a missing name', { email: 'ann@test.dev', password: PASSWORD }]
  ])('rejects %s', async (_label, body) => {
    expect((await register(body)).status).toBe(400);
  });

  it('rejects an email that is already registered', async () => {
    await createUser({ email: 'ann@test.dev' });

    const res = await register({ name: 'Ann', email: 'ann@test.dev', password: PASSWORD });

    expect(res.status).toBe(409);
  });

  it('is rate limited', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await register({ name: 'A', email: `a${i}@test.dev`, password: PASSWORD });
    }

    expect(last.status).toBe(429);
  });
});

describe('logging in', () => {
  it('returns a token and only public user fields', async () => {
    const user = await createUser();

    const res = await login(user.email);

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(Object.keys(res.body.user).sort()).toEqual(['email', 'id', 'name', 'role']);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const user = await createUser();

    const wrongPassword = await login(user.email, 'wrong-password');
    const unknownEmail = await login('nobody@test.dev');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('is not fooled by a NoSQL injection', async () => {
    await createUser();

    const res = await api
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });

    expect(res.status).toBe(401);
  });

  it('is rate limited after 10 attempts', async () => {
    const user = await createUser();
    let last;
    for (let i = 0; i < 11; i++) last = await login(user.email, 'wrong-password');

    expect(last.status).toBe(429);
  });
});

describe('sessions', () => {
  it('/me returns only public fields', async () => {
    const customer = await signIn();

    const res = await customer.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.user).sort()).toEqual(['email', 'id', 'name', 'role']);
  });

  it('rejects a missing or invalid token', async () => {
    expect((await api.get('/api/auth/me')).status).toBe(401);
    expect((await api.get('/api/auth/me').set('Authorization', 'Bearer nonsense')).status).toBe(401);
  });

  it('rejects a token after its user is deleted', async () => {
    const customer = await signIn();
    await User.deleteOne({ _id: customer.user._id });

    expect((await customer.get('/api/auth/me')).status).toBe(401);
  });
});

describe('forgot and reset password', () => {
  it('emails a working link, and old sessions stop working', async () => {
    const customer = await signIn();

    await api.post('/api/auth/forgot-password').send({ email: customer.user.email });
    const res = await api
      .post('/api/auth/reset-password')
      .send({ token: tokenFromEmail(), password: 'new-password-1' });

    expect(res.status).toBe(200);
    expect((await login(customer.user.email, 'new-password-1')).status).toBe(200);
    expect((await login(customer.user.email)).status).toBe(401);
    expect((await customer.get('/api/auth/me')).status).toBe(401);
  });

  it('stores only a hash of the reset token', async () => {
    const user = await createUser();

    await api.post('/api/auth/forgot-password').send({ email: user.email });

    const saved = await User.findById(user._id).select('+resetPasswordTokenHash');
    expect(saved.resetPasswordTokenHash).toBeTruthy();
    expect(saved.resetPasswordTokenHash).not.toBe(tokenFromEmail());
  });

  it('allows a reset link to be used only once', async () => {
    const user = await createUser();
    await api.post('/api/auth/forgot-password').send({ email: user.email });
    const token = tokenFromEmail();
    await api.post('/api/auth/reset-password').send({ token, password: 'new-password-1' });

    const second = await api.post('/api/auth/reset-password').send({ token, password: 'new-password-2' });

    expect(second.status).toBe(400);
  });

  it('rejects an expired reset link', async () => {
    const user = await createUser();
    await api.post('/api/auth/forgot-password').send({ email: user.email });
    await User.updateOne({ _id: user._id }, { resetPasswordExpires: new Date(Date.now() - 1000) });

    const res = await api
      .post('/api/auth/reset-password')
      .send({ token: tokenFromEmail(), password: 'new-password-1' });

    expect(res.status).toBe(400);
  });

  it('gives the same reply whether or not the account exists', async () => {
    const user = await createUser();

    const known = await api.post('/api/auth/forgot-password').send({ email: user.email });
    const unknown = await api.post('/api/auth/forgot-password').send({ email: 'nobody@test.dev' });

    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('does not reveal the account exists when sending the email fails', async () => {
    const user = await createUser();
    sendPasswordResetEmail.mockRejectedValueOnce(new Error('Email provider is down'));
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await api.post('/api/auth/forgot-password').send({ email: user.email });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('Email provider');
  });

  it('in test mode, emails only the test account and says so', async () => {
    const testUser = await createUser({ email: 'owner@test.dev' });
    const otherUser = await createUser();
    enableTestMode(testUser.email);

    const other = await api.post('/api/auth/forgot-password').send({ email: otherUser.email });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(other.body.message).toContain('test account');

    await api.post('/api/auth/forgot-password').send({ email: testUser.email });
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });
});

describe('login codes for the test account', () => {
  const codeFromEmail = () => sendLoginOtp.mock.calls.at(-1)[1];
  const verify = (email, code) =>
    api.post('/api/auth/verify-login').send({ email, code });
  const differentCode = code => (code === '0000' ? '0001' : '0000');

  async function startLogin() {
    const user = await createUser({ email: 'owner@test.dev' });
    enableTestMode(user.email);
    const res = await login(user.email);
    return { user, res };
  }

  it('needs the emailed code before giving a token', async () => {
    const { user, res } = await startLogin();

    expect(res.body.requiresVerification).toBe(true);
    expect(res.body.token).toBeUndefined();

    const verified = await verify(user.email, codeFromEmail());
    expect(verified.status).toBe(200);
    expect(verified.body.token).toEqual(expect.any(String));
  });

  it('does not send a code when the password is wrong', async () => {
    const user = await createUser({ email: 'owner@test.dev' });
    enableTestMode(user.email);

    await login(user.email, 'wrong-password');

    expect(sendLoginOtp).not.toHaveBeenCalled();
  });

  it('rejects a wrong code, and a code can only be used once', async () => {
    const { user } = await startLogin();
    const code = codeFromEmail();

    expect((await verify(user.email, differentCode(code))).status).toBe(400);
    expect((await verify(user.email, code)).status).toBe(200);
    expect((await verify(user.email, code)).status).toBe(400);
  });

  it('rejects an expired code', async () => {
    const { user } = await startLogin();
    await User.updateOne({ _id: user._id }, { loginOtpExpires: new Date(Date.now() - 1000) });

    expect((await verify(user.email, codeFromEmail())).status).toBe(400);
  });

  it('cancels the code after 5 wrong attempts', async () => {
    const { user } = await startLogin();
    const code = codeFromEmail();
    for (let i = 0; i < 5; i++) await verify(user.email, differentCode(code));

    expect((await verify(user.email, code)).status).toBe(400);
  });

  it('makes you wait before requesting another code', async () => {
    const { user } = await startLogin();

    expect((await login(user.email)).status).toBe(429);
    expect(sendLoginOtp).toHaveBeenCalledTimes(1);
  });
});
