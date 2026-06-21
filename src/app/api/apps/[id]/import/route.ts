import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Papa from "papaparse";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppConfigSchema, buildRecordSchema } from "@/types/schema";
import { runWorkflows } from "@/lib/workflows";

// POST /api/apps/[id]/import — bulk CSV import feature (Track A "ANY THREE"
// extra feature #1). Each CSV row is validated against the app's dynamic
// dataSchema individually; bad rows are skipped and reported rather than
// failing the whole import, matching the "handle gracefully" requirement.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.customApp.findUnique({ where: { id: params.id } });
  if (!app || app.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const parsedConfig = AppConfigSchema.safeParse(app.config);
  const config = parsedConfig.success ? parsedConfig.data : AppConfigSchema.parse({});
  const recordSchema = buildRecordSchema(config.dataSchema);

  const body = await req.json().catch(() => null);
  const csvText: string | undefined = body?.csv;
  if (!csvText || typeof csvText !== "string") {
    return NextResponse.json({ error: "Missing 'csv' string in request body" }, { status: 400 });
  }

  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, any>[];

  const created: any[] = [];
  const rejected: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const validation = recordSchema.safeParse(rows[i]);
    if (!validation.success) {
      rejected.push({ row: i + 1, reason: validation.error.issues.map((iss) => iss.message).join("; ") });
      continue;
    }
    const record = await prisma.appRecord.create({ data: { appId: params.id, data: validation.data } });
    created.push(record);
    await runWorkflows(config.workflows, "ON_RECORD_CREATE", (session.user as any).id, validation.data);
  }

  return NextResponse.json({
    success: true,
    importedCount: created.length,
    rejectedCount: rejected.length,
    rejected,
  });
}
