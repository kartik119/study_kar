import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInvitationEmail = async (to: string, token: string, fullName: string, welcomeMessage?: string) => {
  const adminUrl = process.env.ADMIN_APP_URL || 'http://localhost:3000';
  const activationLink = `${adminUrl}/admin/activate?token=${token}`;

  const htmlContent = `
    <h2>Welcome to Study Karnataka, ${fullName}!</h2>
    ${welcomeMessage ? `<p>${welcomeMessage}</p>` : '<p>You have been invited to join the admin team.</p>'}
    <p>Please click the link below to set your password and activate your account:</p>
    <a href="${activationLink}" style="display:inline-block;padding:10px 20px;background-color:#3B82F6;color:#fff;text-decoration:none;border-radius:5px;">Activate Account</a>
    <p>Or copy this link to your browser: ${activationLink}</p>
    <p>This link will expire soon.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Study Karnataka'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@studykarnataka.in'}>`,
      to,
      subject: 'You are invited to join Study Karnataka Admin',
      html: htmlContent,
    });
    
    // For local dev, ethereal provides a preview URL
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('Email sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email delivery failed:', error);
    return { success: false, error };
  }
};
