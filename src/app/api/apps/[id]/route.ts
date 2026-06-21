import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppConfigSchema } from "@/types/schema";

async function getOwnedApp(id: string, userId: string) {
  const app = await prisma.customApp.findUnique({ where: { id } });
  if (!app || app.ownerId !== userId) return null;
  return app;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await getOwnedApp(params.id, session.user.id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  return NextResponse.json({ app });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getOwnedApp(params.id, session.user.id);
  if (!existing) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const rawBody = await req.json();
  const parsed = AppConfigSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Malformed application config", details: parsed.error.format() }, { status: 400 });
  }

  const app = await prisma.customApp.update({
    where: { id: params.id },
    data: { appName: parsed.data.appName, version: parsed.data.version, config: parsed.data },
  });

  return NextResponse.json({ success: true, app });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getOwnedApp(params.id, session.user.id);
  if (!existing) return NextResponse.json({ error: "App not found" }, { status: 404 });

  await prisma.customApp.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
