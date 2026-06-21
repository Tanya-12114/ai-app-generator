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
    where: { ownerId: (session.user as any).id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { records: true } } },
  });

  return NextResponse.json({ apps });
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
        ownerId: (session.user as any).id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: (session.user as any).id,
        message: `App "${app.appName}" was generated successfully.`,
      },
    });

    return NextResponse.json({ success: true, app }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Runtime engine exception", message: error.message }, { status: 500 });
  }
}
