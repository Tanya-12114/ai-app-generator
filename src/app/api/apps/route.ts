import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppConfigSchema } from "@/types/schema";

// GET /api/apps — list the current user's generated apps
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.customApp.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { records: true } } },
  });

  // Derive just the field types for the dashboard's schema-fingerprint
  // preview, instead of shipping each app's full config JSON in a list
  // response that doesn't otherwise need it.
  const withFieldTypes = apps.map((app: (typeof apps)[number]) => {
    const parsed = AppConfigSchema.safeParse(app.config);
    return {
      ...app,
      fieldTypes: parsed.success ? parsed.data.dataSchema.map((f) => f.type) : [],
    };
  });

  return NextResponse.json({ apps: withFieldTypes });
}

// POST /api/apps — compile + persist a new app from a JSON config.
// This is the entry point of the "metadata -> running application" engine:
// the config may be partial/malformed; zod fills defaults for everything
// it safely can rather than rejecting the whole request.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const validationResult = AppConfigSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Malformed application config", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const app = await prisma.customApp.create({
      data: {
        appName: validationResult.data.appName,
        version: validationResult.data.version,
        config: validationResult.data,
        ownerId: session.user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        message: `App "${app.appName}" was generated successfully.`,
      },
    });

    return NextResponse.json({ success: true, app }, { status: 201 });
  } catch (error) {
    // FIX: was returning `error.message` straight to the client, which can
    // leak internal details (stack-adjacent strings, DB error text, etc).
    // Log the real error server-side; tell the client only that something
    // went wrong.
    console.error("[POST /api/apps] unexpected error:", error);
    return NextResponse.json({ error: "Could not generate the app. Please try again." }, { status: 500 });
  }
}