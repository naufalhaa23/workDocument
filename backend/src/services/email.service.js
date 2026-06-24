const nodemailer = require('nodemailer');

// Using an Ethereal dummy account for development, or generic SMTP config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || 'zpb7fnaxndjvylka@ethereal.email',
    pass: process.env.SMTP_PASS || 'YEvtFA9aeqSeRSFv7K' // Generated fallback for ethereal
  }
});

/**
 * Send Password Reset OTP
 */
async function sendResetEmail(toEmail, otpCode) {
  const mailOptions = {
    from: '"Aplikasi Monitoring Dokumen" <noreply@triagungsinergi.com>',
    to: toEmail,
    subject: 'Kode OTP Reset Password',
    text: `Anda meminta pengaturan ulang kata sandi. Berikut adalah kode OTP Anda: ${otpCode}\n\nKode ini berlaku selama 15 menit. Jangan berikan kode ini kepada siapa pun.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Reset Password</h2>
        <p>Anda meminta pengaturan ulang kata sandi. Berikut adalah kode OTP Anda:</p>
        <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #f4f4f4; display: inline-block; letter-spacing: 5px;">
          ${otpCode}
        </div>
        <p>Kode ini berlaku selama 15 menit. Jangan berikan kode ini kepada siapa pun.</p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email] OTP sent to ${toEmail}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  return info;
}

module.exports = {
  sendResetEmail,
};
