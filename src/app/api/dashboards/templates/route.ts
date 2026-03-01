import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { dashboardTemplates, getTemplateById } from "@/lib/dashboard-templates";

// GET /api/dashboards/templates - List available templates (metadata only)
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = dashboardTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    icon: t.icon,
    cardCount: t.cards.length,
  }));

  return NextResponse.json(templates);
}

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  name: z.string().min(1).max(255).optional(),
  databaseId: z.string().min(1, "Database ID is required"),
});

// POST /api/dashboards/templates - Create a dashboard from a template
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const validated = createFromTemplateSchema.parse(body);

    const template = getTemplateById(validated.templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Verify the database connection exists
    const database = await db.databaseConnection.findUnique({
      where: { id: validated.databaseId },
    });

    if (!database) {
      return NextResponse.json(
        { error: "Database connection not found" },
        { status: 404 }
      );
    }

    const dashboardName = validated.name || template.name;

    // Create the dashboard
    const dashboard = await db.dashboard.create({
      data: {
        name: dashboardName,
        description: template.description,
        creatorId: user.id,
        templateId: template.id,
      },
    });

    // Create a Question and DashboardCard for each card in the template
    for (const card of template.cards) {
      const question = await db.question.create({
        data: {
          name: card.title,
          type: "NATIVE_SQL",
          queryDefinition: JSON.stringify({ sql: card.sql }),
          vizSettings: JSON.stringify(card.vizSettings),
          databaseId: validated.databaseId,
          creatorId: user.id,
        },
      });

      await db.dashboardCard.create({
        data: {
          dashboardId: dashboard.id,
          questionId: question.id,
          cardType: "QUESTION",
          layoutX: card.layoutX,
          layoutY: card.layoutY,
          layoutW: card.layoutW,
          layoutH: card.layoutH,
        },
      });
    }

    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: "created_dashboard",
        targetType: "dashboard",
        targetId: dashboard.id,
        metadata: JSON.stringify({
          dashboardName,
          fromTemplate: template.id,
        }),
      },
    });

    // Return the full dashboard with cards
    const createdDashboard = await db.dashboard.findUnique({
      where: { id: dashboard.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        cards: {
          include: {
            question: {
              select: {
                id: true,
                name: true,
                type: true,
                vizSettings: true,
              },
            },
          },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    return NextResponse.json(createdDashboard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to create dashboard from template:", error);
    return NextResponse.json(
      { error: "Failed to create dashboard from template" },
      { status: 500 }
    );
  }
}
