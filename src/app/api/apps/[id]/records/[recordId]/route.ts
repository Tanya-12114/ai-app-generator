import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppConfigSchema, buildRecordSchema } from "@/types/schema";
import { runWorkflows } from "@/lib/workflows";

async function loadOwnedAppAndRecord(appId: string, recordId: string, userId: string) {
  const app = await prisma.customApp.findUnique({ where: { id: appId } });
  if (!app || app.ownerId !== userId) return null;

  const record = await prisma.appRecord.findUnique({ where: { id: recordId } });
  if (!record || record.appId !== appId) return null;

  const parsedConfig = AppConfigSchema.safeParse(app.config);
  const config = parsedConfig.success ? parsedConfig.data : AppConfigSchema.parse({});
  return { app, record, config };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadOwnedAppAndRecord(params.id, params.recordId, (session.user as any).id);
  if (!loaded) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const recordSchema = buildRecordSchema(loaded.config.dataSchema);
  const validation = recordSchema.partial().safeParse(rawBody ?? {});
  if (!validation.success) {
    return NextResponse.json(
      { error: "Record failed dynamic schema validation", details: validation.error.format() },
      { status: 400 }
    );
  }

  const updated = await prisma.appRecord.update({
    where: { id: params.recordId },
    data: { data: { ...(loaded.record.data as object), ...validation.data } },
  });

  await runWorkflows(loaded.config.workflows, "ON_RECORD_UPDATE", (session.user as any).id, updated.data as any);

  return NextResponse.json({ success: true, record: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadOwnedAppAndRecord(params.id, params.recordId, (session.user as any).id);
  if (!loaded) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  await prisma.appRecord.delete({ where: { id: params.recordId } });
  await runWorkflows(loaded.config.workflows, "ON_RECORD_DELETE", (session.user as any).id, loaded.record.data as any);

  return NextResponse.json({ success: true });
}
