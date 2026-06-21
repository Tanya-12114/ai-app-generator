import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppConfigSchema, buildRecordSchema } from "@/types/schema";
import { runWorkflows } from "@/lib/workflows";

async function loadApp(id: string, userId: string) {
  const app = await prisma.customApp.findUnique({ where: { id } });
  if (!app || app.ownerId !== userId) return null;

  const parsedConfig = AppConfigSchema.safeParse(app.config);
  // Config drift (e.g. hand-edited DB row) shouldn't take the whole CRUD
  // endpoint down — fall back to permissive defaults.
  const config = parsedConfig.success ? parsedConfig.data : AppConfigSchema.parse({});
  return { app, config };
}

// GET /api/apps/[id]/records — list records for this app's dynamic table
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadApp(params.id, (session.user as any).id);
  if (!loaded) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const records = await prisma.appRecord.findMany({
    where: { appId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ records, dataSchema: loaded.config.dataSchema });
}

// POST /api/apps/[id]/records — dynamic CRUD execution: validates the body
// against this app's declared dataSchema (built on the fly), persists it,
// and runs any ON_RECORD_CREATE workflows.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const loaded = await loadApp(params.id, (session.user as any).id);
  if (!loaded) return NextResponse.json({ error: "App not found" }, { status: 404 });

  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const recordSchema = buildRecordSchema(loaded.config.dataSchema);
  const validation = recordSchema.safeParse(rawBody ?? {});

  if (!validation.success) {
    return NextResponse.json(
      { error: "Record failed dynamic schema validation", details: validation.error.format() },
      { status: 400 }
    );
  }

  const record = await prisma.appRecord.create({
    data: { appId: params.id, data: validation.data },
  });

  await runWorkflows(loaded.config.workflows, "ON_RECORD_CREATE", (session.user as any).id, validation.data);

  return NextResponse.json({ success: true, record }, { status: 201 });
}
