import nodemailer from "nodemailer";

// All stages after "Initial" that should trigger an email to the lead
export const EMAIL_STAGES = new Set([
  "Connected",
  "Confirmed",
  "Closed",
]);

type Template = { subject: string; heading: string; body: string };

const STAGE_TEMPLATES: Record<string, Template> = {
  Connected: {
    subject: "Application Update - Connected",
    heading: "Connected Stage 🤝",
    body: "Your application is now in the <strong>Connected</strong> stage. Our team will contact you with details.",
  },
  Confirmed: {
    subject: "Congratulations - Order Confirmed!",
    heading: "Order Confirmed 🎯",
    body: "Congratulations! Your order/application has reached the <strong>Confirmed</strong> stage.",
  },
  Closed: {
    subject: "Order Closed - Completed!",
    heading: "Order Closed ✅",
    body: "Your order/application has reached the final <strong>Closed</strong> stage.",
  },
};

function buildHtml(name: string, stage: string): string {
  const t = STAGE_TEMPLATES[stage] ?? {
    heading: `Stage Update: ${stage}`,
    body: `Your application has been updated to the <strong>${stage}</strong> stage. Our team will be in touch shortly.`,
  };
  const fromName = process.env.EMAIL_FROM_NAME ?? "EduFin Services";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b}
  .wrap{max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:#14d279;padding:32px 36px}
  .header h1{color:#fff;font-size:22px;font-weight:700;line-height:1.3}
  .header p{color:rgba(255,255,255,.8);font-size:13px;margin-top:4px}
  .body{padding:32px 36px}
  .greeting{font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px}
  .text{font-size:15px;color:#52525b;line-height:1.65}
  .text strong{color:#18181b}
  .badge{display:inline-block;margin-top:20px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;border-radius:9999px;padding:6px 16px;font-size:13px;font-weight:600}
  .divider{border:none;border-top:1px solid #f4f4f5;margin:28px 0}
  .cta-wrap{text-align:center;margin-top:4px}
  .cta{display:inline-block;background:#14d279;color:#fff;text-decoration:none;border-radius:10px;padding:12px 28px;font-size:14px;font-weight:700}
  .footer{background:#fafafa;border-top:1px solid #f4f4f5;padding:20px 36px;text-align:center}
  .footer p{font-size:12px;color:#a1a1aa;line-height:1.6}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>${t.heading}</h1>
    <p>MBBS Abroad Application Update</p>
  </div>
  <div class="body">
    <p class="greeting">Dear ${name},</p>
    <p class="text">${t.body}</p>
    <div class="badge">Current Stage: ${stage}</div>
    <hr class="divider"/>
    <p class="text">If you have any questions or need assistance, please don't hesitate to reach out to your counsellor. We're here to help at every step.</p>
    <div class="cta-wrap" style="margin-top:24px">
      <a class="cta" href="https://edufinservices.com">Visit Our Website</a>
    </div>
  </div>
  <div class="footer">
    <p><strong>${fromName}</strong><br/>
    Helping students achieve their MBBS abroad dreams.<br/>
    This is an automated notification — please do not reply to this email.</p>
  </div>
</div>
</body>
</html>`;
}

function buildText(name: string, stage: string): string {
  const fromName = process.env.EMAIL_FROM_NAME ?? "EduFin Services";
  const t = STAGE_TEMPLATES[stage];
  const body = t
    ? t.body.replace(/<[^>]+>/g, "")
    : `Your application has been updated to the "${stage}" stage.`;
  return `Dear ${name},\n\n${body}\n\nCurrent Stage: ${stage}\n\nIf you have any questions, please contact your counsellor.\n\nBest regards,\n${fromName}`;
}

export async function sendStageEmail(
  leadName: string,
  leadEmail: string,
  newStage: string
): Promise<void> {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const port = Number(process.env.EMAIL_PORT ?? 587);
  const fromName = process.env.EMAIL_FROM_NAME ?? "EduFin Services";

  if (!host || !user || !pass) {
    console.warn("[email] EMAIL_HOST/USER/PASS not configured — skipping email for", leadEmail);
    return;
  }

  const subject =
    STAGE_TEMPLATES[newStage]?.subject ?? `Application Update: ${newStage}`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: leadEmail,
    subject,
    text: buildText(leadName, newStage),
    html: buildHtml(leadName, newStage),
  });

  console.log(`[email] Sent "${subject}" to ${leadEmail} (stage: ${newStage})`);
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<void> {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const port = Number(process.env.EMAIL_PORT ?? 587);
  const fromName = process.env.EMAIL_FROM_NAME ?? "EduFin Services";

  if (!host || !user || !pass) {
    console.warn("[email] EMAIL_HOST/USER/PASS not configured — reset link:", resetUrl);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = "Reset Your Password - Fxpertise CRM";
    const html = `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;"><h2>Password Reset Request</h2><p>You requested to reset your password for Fxpertise CRM.</p><p style="margin: 24px 0;"><a href="${resetUrl}" style="background-color: #14d279; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a></p><p style="color: #666; font-size: 13px;">Or copy and paste this link in your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p><p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this, please ignore this email.</p></div>`;
    const text = `Hello,\n\nYou requested a password reset. Click the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    console.log(`[email] Sent password reset email to ${toEmail}`);
  } catch (err) {
    console.error("[email] Error sending password reset email:", err);
  }
}
