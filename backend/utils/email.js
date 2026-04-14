const nodemailer = require('nodemailer');

// Si no hay SMTP configurado, los correos se imprimen en consola (modo desarrollo).
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

/**
 * Envía el correo de recuperación de contraseña.
 * En desarrollo (sin SMTP configurado) imprime el enlace en consola.
 * @param {string} email
 * @param {string} resetLink
 */
const sendPasswordResetEmail = async (email, resetLink) => {
  if (!transporter) {
    console.log(`[DEV] Enlace de recuperación para ${email}: ${resetLink}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@tintinluxury.com',
    to: email,
    subject: 'Recuperación de contraseña — Tintin Luxury',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#1a1a1a;">Restablecer contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Tintin Luxury</strong>.</p>
        <p>Haz clic en el botón para continuar (el enlace es válido por <strong>1 hora</strong>):</p>
        <a href="${resetLink}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px;">
          Restablecer contraseña
        </a>
        <p style="color:#666;font-size:13px;">
          Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
        </p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail };
