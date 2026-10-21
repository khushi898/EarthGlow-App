import { Resend } from 'resend';

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing');
  }

  return new Resend(process.env.RESEND_API_KEY);
};

const getSender = () =>
  process.env.EMAIL_FROM || 'EarthGlow <onboarding@resend.dev>';

const sendEmail = async ({ to, subject, text }) => {
  const { data, error } = await getResend().emails.send({
    from: getSender(),
    to: [to],
    subject,
    text
  });

  if (error) {
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  return data;
};

// Send 4-digit login verification code
export const sendLoginOtp = async (email, code) => {
  return sendEmail({
    to: email,
    subject: 'EarthGlow - Your Login Verification Code',
    text: `Welcome to EarthGlow!

Your login verification code is: ${code}

This code expires in 5 minutes.

If you did not request this code, please ignore this email.

EarthGlow Security Team`
  });
};

// Send password-reset link
export const sendPasswordResetEmail = async (email, resetLink) => {
  return sendEmail({
    to: email,
    subject: 'EarthGlow - Reset Your Password',
    text: `Hello,

We received a request to reset your EarthGlow password.

Click the following link to create a new password:

${resetLink}

This link expires in 15 minutes and can only be used once.

If you did not request a password reset, please ignore this email.

EarthGlow Security Team`
  });
};