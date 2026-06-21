import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications — Notifications feature (Track A "ANY THREE" #2).
// Polled by the NotificationBell component.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ notifications });
}

// PATCH /api/notifications — mark one or all notifications read
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = (session.user as any).id;

  if (body?.id) {
    await prisma.notification.updateMany({ where: { id: body.id, userId }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  return NextResponse.json({ success: true });
}
