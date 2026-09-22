const nodemailer = require('nodemailer');
const config = require('../config');

const PLATFORM = process.env.PLATFORM_NAME || 'Ciphera';

/**
 * Resolve SMTP credentials from whichever provider is configured.
 * Returns null when nothing is set up, which puts every send into
 * console-fallback mode instead of failing.
 */
const getEmailConfig = () => {
  // Brevo (Sendinblue) - 300 emails/day free
  if (process.env.BREVO_API_KEY) {
    return {
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_EMAIL || process.env.FROM_EMAIL,
        pass: process.env.BREVO_API_KEY
      }
    };
  }

  // Mailgun - 5000 emails/month free
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return {
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY
      }
    };
  }

  // SendGrid - 100 emails/day free
  if (process.env.SENDGRID_API_KEY) {
    return {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
    };
  }

  // Custom SMTP fallback
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    };
  }

  return null;
};

// Build the transporter ONCE. The previous implementation created a fresh
// one per send, which opened a new SMTP connection for every single OTP.
const emailConfig = getEmailConfig();
const transporter = emailConfig ? nodemailer.createTransport(emailConfig) : null;

const fromAddress =
  config.email.from ||
  process.env.BREVO_EMAIL ||
  process.env.SMTP_USER ||
  `noreply@${PLATFORM.toLowerCase()}.local`;

if (!transporter) {
  console.warn('[Email] No provider configured - emails will be printed to the console.');
}

/**
 * Single outbound path. Throws on a real send failure so callers can decide
 * whether that is fatal (an explicit "resend" request) or not (registration,
 * which must never fail because email failed).
 */
const sendMail = async ({ to, subject, html, consoleFallback }) => {
  if (!transporter) {
    console.log(`\n=== EMAIL (no provider configured) ===`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (consoleFallback) console.log(consoleFallback);
    console.log(`=== END EMAIL ===\n`);
    return { sent: false, consoleFallback: true };
  }

  await transporter.sendMail({ from: fromAddress, to, subject, html });
  console.log(`[Email] Sent "${subject}" to ${to}`);
  return { sent: true, consoleFallback: false };
};

// --- Shared chrome ---------------------------------------------------------

const shell = (title, body) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2c3e50; margin: 0;">${PLATFORM}</h1>
      <p style="color: #7f8c8d; margin: 5px 0;">Capture The Flag Platform</p>
    </div>
    <div style="background: linear-gradient(135deg, #7e22ce 0%, #4c1d95 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
      <h2 style="color: white; margin: 0 0 15px 0;">${title}</h2>
      ${body}
    </div>
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
      <p style="color: #95a5a6; font-size: 12px; margin: 0;">This is an automated message, please do not reply.</p>
    </div>
  </div>
`;

const button = (url, label) => `
  <a href="${url}" style="display: inline-block; background: #ffffff; color: #4c1d95; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">${label}</a>
  <p style="color: #ddd6fe; font-size: 12px; margin: 10px 0 0 0; word-break: break-all;">${url}</p>
`;

// --- Public senders --------------------------------------------------------

const sendOTPEmail = async (email, otp) =>
  sendMail({
    to: email,
    subject: `${PLATFORM} - Verify your email`,
    consoleFallback: `OTP: ${otp} (valid for 10 minutes)`,
    html: shell('Email Verification', `
      <p style="color: #ecf0f1; margin: 0;">Your one-time verification code is:</p>
      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #fff; letter-spacing: 8px; margin: 0; font-size: 32px;">${otp}</h1>
      </div>
      <p style="color: #ddd6fe; font-size: 14px; margin: 0;">Valid for 10 minutes. Never share this code with anyone.</p>
    `)
  });

const sendPasswordResetEmail = async (email, resetUrl) =>
  sendMail({
    to: email,
    subject: `${PLATFORM} - Reset your password`,
    consoleFallback: `Reset URL: ${resetUrl} (valid for 10 minutes)`,
    html: shell('Password Reset', `
      <p style="color: #ecf0f1; margin: 0;">Use the link below to choose a new password.</p>
      ${button(resetUrl, 'Reset Password')}
      <p style="color: #ddd6fe; font-size: 14px; margin: 0;">This link expires in 10 minutes. If you did not request a reset, you can safely ignore this email &mdash; your password has not changed.</p>
    `)
  });

const sendPasswordChangedEmail = async (email) =>
  sendMail({
    to: email,
    subject: `${PLATFORM} - Your password was changed`,
    consoleFallback: 'Password-changed notification',
    html: shell('Password Changed', `
      <p style="color: #ecf0f1; margin: 0;">The password on your account was just changed, and all existing sessions were signed out.</p>
      <p style="color: #ddd6fe; font-size: 14px; margin: 20px 0 0 0;">If this wasn't you, reset your password immediately and contact an administrator.</p>
    `)
  });

/**
 * Sent when somebody tries to register with an address that already has an
 * account. Registration itself returns the same envelope as a fresh signup,
 * so this email is the only thing that differs -- the endpoint stays
 * enumeration-resistant.
 */
const sendAccountExistsEmail = async (email, loginUrl) =>
  sendMail({
    to: email,
    subject: `${PLATFORM} - You already have an account`,
    consoleFallback: `Account already exists. Login: ${loginUrl}`,
    html: shell('Account Already Exists', `
      <p style="color: #ecf0f1; margin: 0;">Someone just tried to sign up with this email address, but an account already exists.</p>
      ${button(loginUrl, 'Sign In')}
      <p style="color: #ddd6fe; font-size: 14px; margin: 0;">If you've forgotten your password, use the "Forgot password?" link on the sign-in page.</p>
    `)
  });

module.exports = {
  sendMail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountExistsEmail,
  isEmailConfigured: () => Boolean(transporter)
};
