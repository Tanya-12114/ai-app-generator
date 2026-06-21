import { prisma } from "./prisma";
import { Workflow, WorkflowTriggerEnum } from "@/types/schema";
import { z } from "zod";

function interpolate(template: string, record: Record<string, any>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(record[key] ?? ""));
}

/**
 * FIX — SSRF hardening for the WEBHOOK action.
 *
 * `action.url` is supplied by whoever wrote the app config (any
 * authenticated user), and the server fetches it directly. Without a
 * check, that's a server-side request forgery primitive: a workflow could
 * be pointed at `http://169.254.169.254/...` (cloud metadata service) or
 * `http://localhost:5432` (the app's own Postgres) and use this server's
 * network position to probe internal infrastructure.
 *
 * This blocks the obvious cases by hostname/literal-IP pattern. It is NOT
 * a complete fix — a hostname that *resolves* to a private IP (DNS
 * rebinding) would slip through, since that requires resolving the DNS
 * record and checking the resolved address, not just the URL string. For
 * a take-home of this scope, this is the right tradeoff to call out
 * explicitly rather than silently leave open: worth raising in the
 * architecture review.
 */
function isBlockedWebhookTarget(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return true; // not a parseable URL at all
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host === "169.254.169.254") return true;

  // IPv4 literal private/link-local ranges.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
  }

  return false;
}

// Executes any workflow rules attached to an app's config that match the
// given trigger. Actions are deliberately limited to NOTIFY + WEBHOOK —
// declarative, sandboxed automation rather than arbitrary code execution.
export async function runWorkflows(
  workflows: Workflow[],
  trigger: z.infer<typeof WorkflowTriggerEnum>,
  ownerId: string,
  record: Record<string, any>
) {
  const matching = workflows.filter((w) => w.trigger === trigger);

  for (const workflow of matching) {
    for (const action of workflow.actions) {
      try {
        if (action.type === "NOTIFY") {
          await prisma.notification.create({
            data: {
              userId: ownerId,
              message: interpolate(action.message || "A workflow rule fired.", record),
            },
          });
        } else if (action.type === "WEBHOOK" && action.url) {
          if (isBlockedWebhookTarget(action.url)) {
            console.warn("[workflows] blocked webhook to disallowed target:", action.url);
            continue;
          }
          // Fire-and-forget — a slow/dead webhook should never block the
          // user-facing CRUD response.
          fetch(action.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trigger, record }),
          }).catch(() => {});
        }
      } catch {
        // Workflow failures must never break the underlying CRUD operation.
      }
    }
  }
}
