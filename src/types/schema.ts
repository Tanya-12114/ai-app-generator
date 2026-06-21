import { z } from "zod";

let idCounter = 0;
/** Used as a zod `.default()` factory wherever an "id" field is structural
 *  metadata (a React key, basically) rather than real content. A config
 *  author forgetting to set one shouldn't cost them the whole section/rule —
 *  see the FIX note on AppConfigSchema below for why this matters. */
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}

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
  // FIX: was `z.string()` (required, no default). A section missing "id"
  // used to fail validation for that section entirely, which — combined
  // with the old strict `z.array(SectionSchema)` — silently dropped the
  // *entire app config*, not just the one section. See genId() above.
  id: z.string().optional().default(() => genId("section")),
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
  // FIX: same reasoning as SectionSchema.id above.
  id: z.string().optional().default(() => genId("wf")),
  trigger: WorkflowTriggerEnum,
  actions: z.array(WorkflowActionSchema).optional().default([]),
});

/* ---------------------------------------------------------------------- */
/* Top level App config                                                   */
/* ---------------------------------------------------------------------- */

/**
 * FIX — this is the actual bug, not just a defensive nicety:
 *
 * `z.array(SomeSchema)` fails its *entire* parse the moment ONE item in the
 * array fails (e.g. a dataSchema entry missing "name", or a workflow with
 * an invalid "trigger"). Since AppConfigSchema is one big object, that one
 * bad array item bubbled up and rejected the WHOLE app config with a 400 —
 * exactly the "missing fields / invalid values / inconsistent schemas"
 * scenario the assignment says must be handled gracefully "without
 * breaking." Before this fix, a single typo in one field definition meant
 * the user couldn't save *any* of their other valid entities, sections, or
 * workflows either.
 *
 * `lenientArray` parses each item independently and keeps only the ones
 * that validate (with their own per-field defaults still applied) —
 * matching how the assignment explicitly asks unknown *components* to be
 * handled ("fail gracefully" instead of breaking the page), just applied
 * one level up to schema/workflow entries too.
 */
function lenientArray<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .array(z.any())
    .optional()
    .default([])
    .transform((items) =>
      items
        .map((item) => itemSchema.safeParse(item))
        .filter((r): r is z.SafeParseSuccess<z.infer<T>> => r.success)
        .map((r) => r.data)
    );
}

export const AppConfigSchema = z.object({
  appName: z.string().optional().default("AI Scaled Hub"),
  version: z.string().optional().default("1.0.0"),
  sections: lenientArray(SectionSchema),
  dataSchema: lenientArray(DataFieldSchema),
  workflows: lenientArray(WorkflowSchema),
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
        // FIX: `z.coerce.boolean()` ran every value through JS's `Boolean()`,
        // and `Boolean("false")` is `true` — any non-empty string coerced to
        // true. A CSV/form value of "false" (or "0") for a BOOLEAN field was
        // silently stored as `true`. Tested against the project's installed
        // zod version before/after this fix; see PR notes / Loom for the repro.
        base = z.preprocess((v) => {
          if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
          if (v === undefined || v === null || v === "") return false;
          return v;
        }, z.boolean());
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
        // FIX: a required STRING field previously accepted "" (an empty
        // string still satisfies z.string()), so "required" wasn't actually
        // enforced for the most common field type.
        if (f.required) base = (base as z.ZodString).min(1, `${f.name} is required`);
    }

    if (!f.required) {
      base = base.optional().nullable();
    }

    shape[f.name] = base;
  }

  // Unknown/extra fields are passed through (kept), not rejected — keeps
  // the runtime resilient to schema drift instead of hard-failing on minor
  // mismatches, without silently discarding data the caller sent.
  return z.object(shape).passthrough();
}

/**
 * FIX — `DataField.default` was declared in the schema (so config authors
 * could write `{ "name": "status", "default": "OPEN" }`) but nothing ever
 * read it: POST /records and the CSV importer validated the raw request
 * body directly, so a required field with a configured default still
 * rejected a request that omitted it. This merges declared defaults in
 * before validation, exactly where both `record-service`-style call sites
 * need it. Existing values in `payload` always win over the default.
 */
export function applyFieldDefaults(fields: DataField[], payload: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...payload };
  for (const f of fields) {
    if ((merged[f.name] === undefined || merged[f.name] === null) && f.default !== undefined) {
      merged[f.name] = f.default;
    }
  }
  return merged;
}
