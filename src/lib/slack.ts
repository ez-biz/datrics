import { prisma } from "@/lib/db";

async function getSlackWebhookUrl(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: "slack_webhook_url" },
  });
  return setting?.value || null;
}

export async function sendSlackNotification(
  title: string,
  message: string
): Promise<boolean> {
  try {
    const webhookUrl = await getSlackWebhookUrl();
    if (!webhookUrl) return false;

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*${title}*\n${message}`,
      }),
    });

    return res.ok;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}

export async function sendTestSlackNotification(): Promise<boolean> {
  return sendSlackNotification(
    "InsightBase Test",
    "Your Slack webhook is configured correctly."
  );
}
