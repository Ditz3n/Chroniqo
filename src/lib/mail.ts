// src/lib/mail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  locale: string = "da",
) => {
  const isDanish = locale === "da";
  // The middleware will automatically redirect /reset-password to /[locale]/reset-password
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  const subject = isDanish
    ? "Nulstil din adgangskode på Chroniqo"
    : "Reset your Chroniqo password";
  const title = isDanish ? "Nulstil adgangskode" : "Reset your password";
  const intro = isDanish
    ? "Du har anmodet om at nulstille din adgangskode. Klik på knappen nedenfor for at vælge en ny adgangskode."
    : "You requested to reset your password. Click the button below to set a new password.";
  const btnLabel = isDanish ? "Nulstil adgangskode" : "Reset Password";
  const footer = isDanish
    ? "Linket udløber om 1 time. Hvis du ikke anmodede om dette, kan du ignorere denne mail."
    : "This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.";

  const mailOptions = {
    from: `"Chroniqo Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #E65C69; font-weight: 800; font-size: 24px; margin-bottom: 16px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${intro}</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 28px; background-color: #E65C69; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 24px; font-size: 16px;">${btnLabel}</a>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">${footer}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendEmailVerificationEmail = async (
  email: string,
  token: string,
  locale: string = "da",
) => {
  const isDanish = locale === "da";
  // Handled directly by the API route - no middleware redirect needed
  const verifyLink = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  const subject = isDanish
    ? "Bekræft din e-mailadresse på Chroniqo"
    : "Verify your email address on Chroniqo";
  const title = isDanish
    ? "Bekræft din e-mailadresse"
    : "Verify your email address";
  const intro = isDanish
    ? "Tak for din oprettelse på Chroniqo. Klik på knappen nedenfor for at bekræfte din e-mailadresse."
    : "Thank you for signing up for Chroniqo. Click the button below to verify your email address.";
  const btnLabel = isDanish ? "Bekræft e-mail" : "Verify email";
  const footer = isDanish
    ? "Linket udløber om 1 time. Hvis du ikke oprettede en konto, kan du roligt ignorere denne mail."
    : "This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.";

  const mailOptions = {
    from: `"Chroniqo Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #E65C69; font-weight: 800; font-size: 24px; margin-bottom: 16px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${intro}</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 28px; background-color: #E65C69; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 24px; font-size: 16px;">${btnLabel}</a>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">${footer}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sent immediately after manual signup. Link points to the dedicated
 * /api/auth/verify-signup route (isolated from the optional profile email
 * verification flow). Expires after 24 hours to give users a full day.
 */
export const sendSignupVerificationEmail = async (
  email: string,
  token: string,
  locale: string = "da",
) => {
  const isDanish = locale === "da";
  const verifyLink = `${process.env.NEXTAUTH_URL}/api/auth/verify-signup?token=${token}`;

  const subject = isDanish
    ? "Bekræft din e-mail for at starte på Chroniqo"
    : "Verify your email to get started on Chroniqo";
  const title = isDanish ? "Et trin mere" : "One last step";
  const intro = isDanish
    ? "Tak for din oprettelse! Klik på knappen nedenfor for at bekræfte din e-mailadresse og fortsætte med din profil."
    : "Thanks for signing up! Click the button below to verify your email address and continue setting up your profile.";
  const btnLabel = isDanish ? "Bekræft e-mail" : "Verify email";
  const footer = isDanish
    ? "Linket udløber om 24 timer. Hvis du ikke oprettede en konto, kan du roligt ignorere denne mail."
    : "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.";

  const mailOptions = {
    from: `"Chroniqo Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #E65C69; font-weight: 800; font-size: 24px; margin-bottom: 16px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${intro}</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 28px; background-color: #E65C69; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 24px; font-size: 16px;">${btnLabel}</a>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">${footer}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendUsernameChangeEmail = async (
  email: string,
  token: string,
  locale: string = "da",
) => {
  const isDanish = locale === "da";
  const confirmLink = `${process.env.NEXTAUTH_URL}/confirm-username?token=${token}`;

  const subject = isDanish
    ? "Bekræft ændring af brugernavn på Chroniqo"
    : "Confirm your username change on Chroniqo";
  const title = isDanish ? "Skift brugernavn" : "Change username";
  const intro = isDanish
    ? "Du har anmodet om at ændre dit brugernavn på Chroniqo. Klik på knappen nedenfor for at vælge dit nye brugernavn."
    : "You requested to change your username on Chroniqo. Click the button below to choose your new username.";
  const btnLabel = isDanish ? "Skift brugernavn" : "Change username";
  const footer = isDanish
    ? "Linket udløber om 1 time. Hvis du ikke anmodede om dette, kan du ignorere denne mail."
    : "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.";

  const mailOptions = {
    from: `"Chroniqo Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #E65C69; font-weight: 800; font-size: 24px; margin-bottom: 16px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${intro}</p>
        <a href="${confirmLink}" style="display: inline-block; padding: 12px 28px; background-color: #E65C69; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 24px; font-size: 16px;">${btnLabel}</a>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">${footer}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendBanEmail = async (
  email: string,
  locale: string,
  reason?: string | null,
  expiresAt?: Date | null,
) => {
  const isDanish = locale === "da";

  const title = isDanish ? "DU ER BLEVET BANDLYST" : "YOU HAVE BEEN BANNED";
  const intro = isDanish
    ? "Din konto på Chroniqo er blevet bandlyst af vores administratorer som følge af en overtrædelse af vores retningslinjer."
    : "Your account on Chroniqo has been banned by our administrators due to a violation of our guidelines.";

  const reasonLabel = isDanish ? "Årsag:" : "Reason:";
  const reasonText =
    reason || (isDanish ? "Ingen årsag angivet." : "No reason provided.");

  const durationLabel = isDanish ? "Varighed:" : "Duration:";
  const durationText = expiresAt
    ? (isDanish ? "Midlertidig indtil " : "Temporary until ") +
      expiresAt.toLocaleString(locale)
    : isDanish
      ? "Permanent"
      : "Permanent";

  const footer = isDanish
    ? "Hvis du mener dette er en fejl, kan du kontakte support ved at besvare denne mail."
    : "If you believe this is a mistake, you can contact support by replying to this email.";

  const mailOptions = {
    from: `"Chroniqo Moderation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: isDanish
      ? "Din Chroniqo-konto er blevet bandlyst"
      : "Your Chroniqo account has been banned",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #E65C69; font-weight: 800; font-size: 24px; margin-bottom: 16px; letter-spacing: 1px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${intro}</p>
        
        <div style="background-color: rgba(230, 92, 105, 0.1); border: 1px solid rgba(230, 92, 105, 0.2); border-radius: 12px; padding: 20px; text-align: left; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; color: #121212;"><strong style="color: #E65C69;">${reasonLabel}</strong> ${reasonText}</p>
          <p style="margin: 0; color: #121212;"><strong style="color: #E65C69;">${durationLabel}</strong> ${durationText}</p>
        </div>

        <p style="color: #666; font-size: 14px;">${footer}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendUnbanEmail = async (email: string, locale: string) => {
  const isDanish = locale === "da";

  const title = isDanish ? "DU ER BLEVET FRIGIVET" : "YOU HAVE BEEN UNBANNED";
  const intro = isDanish
    ? "Din konto på Chroniqo er blevet frigivet af vores administratorer. Du kan nu logge ind igen og bruge platformen som normalt."
    : "Your account on Chroniqo has been unbanned by our administrators. You can now log in again and use the platform as normal.";

  const footer = isDanish
    ? "Hvis du har spørgsmål, kan du kontakte support ved at besvare denne mail."
    : "If you have any questions, you can contact support by replying to this email.";

  const loginLabel = isDanish ? "Log ind på Chroniqo" : "Log in to Chroniqo";
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`;

  const mailOptions = {
    from: `"Chroniqo Moderation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: isDanish
      ? "Din Chroniqo-konto er blevet frigivet"
      : "Your Chroniqo account has been unbanned",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #27ae60; font-weight: 800; font-size: 24px; margin-bottom: 16px; letter-spacing: 1px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${intro}</p>
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0; font-size: 16px;">${loginLabel}</a>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">${footer}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sends a deletion confirmation email containing a single-use link.
 * The link expires after 1 hour. Middleware auto-adds locale to /confirm-delete.
 */
export const sendAccountDeletionEmail = async (
  email: string,
  token: string,
  locale: string,
) => {
  const isDanish = locale === "da";

  const confirmLink = `${process.env.NEXTAUTH_URL}/confirm-delete?token=${token}`;

  const title = isDanish
    ? "Bekræft sletning af din konto"
    : "Confirm account deletion";
  const intro = isDanish
    ? "Vi har modtaget en anmodning om permanent sletning af din Chroniqo-konto og alle tilknyttede data."
    : "We received a request to permanently delete your Chroniqo account and all associated data.";
  const warningText = isDanish
    ? "Alle dine opslag, kommentarer, beskeder og profildata vil blive slettet. Denne handling kan ikke fortrydes."
    : "All your posts, comments, messages, and profile data will be deleted. This action cannot be undone.";
  const btnLabel = isDanish ? "Bekræft sletning" : "Confirm deletion";
  const ignoreText = isDanish
    ? "Hvis du ikke anmodede om dette, kan du ignorere denne e-mail. Din konto forbliver uændret. Linket udløber om 1 time."
    : "If you did not request this, you can safely ignore this email. Your account will remain unchanged. The link expires in 1 hour.";

  const mailOptions = {
    from: `"Chroniqo Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: isDanish
      ? "Bekræft sletning af din Chroniqo-konto"
      : "Confirm deletion of your Chroniqo account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f7f5; padding: 40px; border-radius: 16px; text-align: center;">
        <h1 style="color: #E65C69; font-weight: 800; font-size: 24px; margin-bottom: 16px;">${title}</h1>
        <p style="color: #121212; font-size: 16px; line-height: 1.5; margin-bottom: 16px;">${intro}</p>
        <div style="background-color: rgba(230, 92, 105, 0.1); border: 1px solid rgba(230, 92, 105, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
          <p style="margin: 0; color: #121212; font-size: 14px; line-height: 1.6;">${warningText}</p>
        </div>
        <a href="${confirmLink}" style="display: inline-block; padding: 12px 28px; background-color: #E65C69; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 24px; font-size: 16px;">${btnLabel}</a>
        <p style="color: #666; font-size: 13px; line-height: 1.5;">${ignoreText}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
