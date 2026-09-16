const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Free email service configurations
const getFreeEmailConfig = () => {
  // Brevo (Sendinblue) - 300 emails/day free
  if (process.env.BREVO_API_KEY) {
    return {
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_EMAIL || 'your-email@example.com',
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
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    };
  }
  
  // Custom SMTP fallback
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
  }
  
  return null;
};

const sendOTPEmail = async (email, otp) => {
  try {
    const emailConfig = getFreeEmailConfig();
    
    if (emailConfig) {
      const transporter = nodemailer.createTransport(emailConfig);
      
      const fromEmail = process.env.FROM_EMAIL || 
                       process.env.BREVO_EMAIL || 
                       process.env.SMTP_USER || 
                       'noreply@pwngrid.com';
      
      const mailOptions = {
        from: fromEmail,
        to: email,
        subject: 'PWNGrid - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0;">🛡️ PWNGrid</h1>
              <p style="color: #7f8c8d; margin: 5px 0;">Cybersecurity Training Platform</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h2 style="color: white; margin: 0 0 15px 0;">Email Verification</h2>
              <p style="color: #ecf0f1; margin: 0;">Your One-Time Password is:</p>
              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #fff; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
              </div>
              <p style="color: #bdc3c7; font-size: 14px; margin: 0;">Valid for 10 minutes</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
              <h3 style="color: #2c3e50; margin: 0 0 10px 0;">🔐 Security Notice</h3>
              <ul style="color: #5a6c7d; margin: 0; padding-left: 20px;">
                <li>Never share this OTP with anyone</li>
                <li>PWNGrid staff will never ask for your OTP</li>
                <li>If you didn't request this, ignore this email</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #95a5a6; font-size: 12px; margin: 0;">This is an automated message, please do not reply.</p>
              <p style="color: #95a5a6; font-size: 12px; margin: 5px 0 0 0;">© 2024 PWNGrid - Cybersecurity Training Platform</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}`);
      return true;
    }

    // If no email service is configured, log to console
    console.log(`\n🔔 === OTP EMAIL (Development Mode) ===`);
    console.log(`📧 To: ${email}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`🔔 === END OTP ===\n`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail };