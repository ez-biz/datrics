import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeAQR, executeRawSQL } from "@/lib/query-engine/query-executor";
import {
  extractValue,
  evaluateCondition,
  formatOperator,
  AlertOperator,
} from "@/lib/alert-evaluator";
import { sendEmail } from "@/lib/email";
import { sendSlackNotification } from "@/lib/slack";

// POST /api/alerts/check - Run all enabled alerts for the current user
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const alerts = await db.alert.findMany({
    where: { creatorId: user.id, enabled: true },
    include: {
      question: true,
    },
  });

  const results: Array<{
    alertId: string;
    triggered: boolean;
    value: number | null;
    error?: string;
  }> = [];

  for (const alert of alerts) {
    try {
      const question = alert.question;
      const queryDef = JSON.parse(question.queryDefinition);

      let queryResult;
      if (question.type === "NATIVE_SQL") {
        queryResult = await executeRawSQL(question.databaseId, queryDef.sql || queryDef);
      } else {
        queryResult = await executeAQR(question.databaseId, queryDef);
      }

      const value = extractValue(queryResult, alert.valueSource);
      const now = new Date();

      if (value === null || isNaN(value)) {
        await db.alert.update({
          where: { id: alert.id },
          data: { lastCheckedAt: now },
        });
        results.push({ alertId: alert.id, triggered: false, value: null });
        continue;
      }

      const triggered = evaluateCondition(
        value,
        alert.operator as AlertOperator,
        alert.threshold
      );

      const updateData: Record<string, unknown> = {
        lastCheckedAt: now,
        lastValue: value,
      };

      if (triggered) {
        updateData.lastTriggeredAt = now;

        const title = `Alert: ${alert.name}`;
        const message = `"${question.name}" returned ${value} which is ${formatOperator(alert.operator as AlertOperator)} ${alert.threshold}`;

        // Create in-app notification
        if (alert.notifyInApp) {
          await db.notification.create({
            data: {
              userId: user.id,
              alertId: alert.id,
              title,
              message,
              type: "alert",
              metadata: JSON.stringify({
                questionId: question.id,
                value,
                threshold: alert.threshold,
                operator: alert.operator,
              }),
            },
          });
        }

        // Send email notification
        if (alert.notifyEmail && user.email) {
          await sendEmail(
            user.email,
            title,
            `<h3>${title}</h3><p>${message}</p><p>Question: ${question.name}</p>`
          );
        }

        // Send Slack notification
        if (alert.notifySlack) {
          await sendSlackNotification(title, message);
        }
      }

      await db.alert.update({
        where: { id: alert.id },
        data: updateData,
      });

      results.push({ alertId: alert.id, triggered, value });
    } catch (error) {
      console.error(`Alert check failed for ${alert.id}:`, error);
      results.push({
        alertId: alert.id,
        triggered: false,
        value: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
