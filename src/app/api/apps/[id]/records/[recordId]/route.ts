import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppConfigSchema, buildRecordSchema, applyFieldDefaults } from "@/types/schema";
import { runWorkflows } from "@/lib/workflows";

async function loadApp(id: string, userId: string) {
  const app = await prisma.customApp.findUnique({ where: { id } });
  if (!app || app.ownerId !== userId) return null;
  const parsedConfig = AppConfigSchema.safeParse(app.config);
  const config = parsedConfig.success ? parsedConfig.data : AppConfigSchema.parse({});
  return { app, config };
}

// PATCH /api/apps/[id]/records/[recordId] — inline edit
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadApp(params.id, session.user.id);
  if (!loaded) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const record = await prisma.appRecord.findFirst({
    where: { id: params.recordId, appId: params.id },
  });
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  let rawBody: any;
  try { rawBody = await req.json(); }
  catch { return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 }); }

  const recordSchema = buildRecordSchema(loaded.config.dataSchema);
  const withDefaults = applyFieldDefaults(loaded.config.dataSchema, rawBody ?? {});
  const validation = recordSchema.safeParse(withDefaults);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const updated = await prisma.appRecord.update({
    where: { id: params.recordId },
    data: { data: validation.data },
  });

  await runWorkflows(loaded.config.workflows, "ON_RECORD_UPDATE", session.user.id, validation.data);

  return NextResponse.json({ success: true, record: updated });
}

// DELETE /api/apps/[id]/records/[recordId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadApp(params.id, session.user.id);
  if (!loaded) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const record = await prisma.appRecord.findFirst({
    where: { id: params.recordId, appId: params.id },
  });
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  await prisma.appRecord.delete({ where: { id: params.recordId } });

  await runWorkflows(loaded.config.workflows, "ON_RECORD_DELETE", session.user.id, record.data as any);

  return NextResponse.json({ success: true });
}
