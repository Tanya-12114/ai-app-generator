import { z } from "zod";

/* ---------------------------------------------------------------------- */
/* UI Component / Layout config — drives the rendering engine             */
/* ---------------------------------------------------------------------- */

export const ComponentSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional().default("Untitled Field"),
  placeholder: z.string().optional().default("Enter details..."),
  field: z.string().optional(), // maps this component to a dataSchema field, for forms
  props: z.record(z.any()).optional().default({}),
});

export const SectionSchema = z.object({
  id: z.string(),
  title: z.string().optional().default("Section Panel"),
  layout: z.enum(["GRID", "STACK", "RESPONSIVE"]).optional().default("STACK"),
  components: z.array(z.any()).optional().default([]),
});

/* ---------------------------------------------------------------------- */
/* Data schema — drives the dynamic backend CRUD runtime                  */
/* ---------------------------------------------------------------------- */

export const FieldTypeEnum = z.enum([
  "STRING",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "EMAIL",
  "SELECT",
]);

export const DataFieldSchema = z.object({
  name: z.string(),
  type: FieldTypeEnum.optional().default("STRING"),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional().default([]), // for SELECT
  default: z.any().optional(),
});

/* ---------------------------------------------------------------------- */
/* Workflow automation — executed by the backend on record lifecycle      */
/* events. Kept intentionally small/declarative so it can run safely      */
/* server-side without arbitrary code execution.                         */
/* ---------------------------------------------------------------------- */

export const WorkflowTriggerEnum = z.enum([
  "ON_RECORD_CREATE",
  "ON_RECORD_UPDATE",
  "ON_RECORD_DELETE",
]);

export const WorkflowActionSchema = z.object({
  type: z.enum(["NOTIFY", "WEBHOOK"]),
  // NOTIFY: message template, supports {{field}} interpolation from the record
  message: z.string().optional(),
  // WEBHOOK: best-effort fire-and-forget POST of the record payload
  url: z.string().url().optional(),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  trigger: WorkflowTriggerEnum,
  actions: z.array(WorkflowActionSchema).optional().default([]),
});

/* ---------------------------------------------------------------------- */
/* Top level App config                                                   */
/* ---------------------------------------------------------------------- */

export const AppConfigSchema = z.object({
  appName: z.string().optional().default("AI Scaled Hub"),
  version: z.string().optional().default("1.0.0"),
  sections: z.array(SectionSchema).optional().default([]),
  dataSchema: z.array(DataFieldSchema).optional().default([]),
  workflows: z.array(WorkflowSchema).optional().default([]),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ComponentConfig = z.infer<typeof ComponentSchema>;
export type DataField = z.infer<typeof DataFieldSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

/* ---------------------------------------------------------------------- */
/* Dynamic record validation — builds a zod object schema on the fly from */
/* an app's dataSchema, so the backend can validate arbitrary CRUD bodies. */
/* ---------------------------------------------------------------------- */

export function buildRecordSchema(fields: DataField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const f of fields) {
    let base: z.ZodTypeAny;
    switch (f.type) {
      case "NUMBER":
        base = z.coerce.number();
        break;
      case "BOOLEAN":
        base = z.coerce.boolean();
        break;
      case "DATE":
        base = z.coerce.date();
        break;
      case "EMAIL":
        base = z.string().email();
        break;
      case "SELECT":
        base = f.options.length ? z.enum(f.options as [string, ...string[]]) : z.string();
        break;
      default:
        base = z.string();
    }

    if (!f.required) {
      base = base.optional().nullable();
    }

    shape[f.name] = base;
  }

  // Unknown/extra fields are stripped, not rejected — keeps the runtime
  // resilient to schema drift instead of hard-failing on minor mismatches.
  return z.object(shape).passthrough();
}
