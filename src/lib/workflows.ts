import { prisma } from "./prisma";
import { Workflow, WorkflowTriggerEnum } from "@/types/schema";
import { z } from "zod";

function interpolate(template: string, record: Record<string, any>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(record[key] ?? ""));
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
