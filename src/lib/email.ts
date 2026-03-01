import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const keys = [
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_pass",
    "smtp_from",
    "smtp_secure",
  ];

  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (!map.smtp_host || !map.smtp_port || !map.smtp_from) {
    return null;
  }

  return {
    host: map.smtp_host,
    port: parseInt(map.smtp_port, 10),
    user: map.smtp_user || "",
    pass: map.smtp_pass || "",
    from: map.smtp_from,
    secure: map.smtp_secure === "true",
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config) return false;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user && config.pass
        ? { auth: { user: config.user, pass: config.pass } }
        : {}),
    });

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendTestEmail(to: string): Promise<boolean> {
  return sendEmail(
    to,
    "InsightBase Test Email",
    "<h2>Test Email</h2><p>Your SMTP configuration is working correctly.</p>"
  );
}
