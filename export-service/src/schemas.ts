import { z } from "zod";

const textField = z.string();
const nonEmptyTextField = z.string().trim().min(1);

export const exportLineSchema = z
  .object({
    notation: textField.optional(),
    lyric: textField.optional()
  })
  .strict()
  .refine((line) => line.notation !== undefined || line.lyric !== undefined, {
    message: "line must include notation or lyric"
  });

export const exportSlideSchema = z
  .object({
    title: nonEmptyTextField,
    subtitle: textField.optional(),
    metadata: textField.optional(),
    lines: z.array(exportLineSchema).min(1)
  })
  .strict();

const customLayoutSchema = z.object({
  beatsPerLine: z.number().int().positive(),
  linesPerPage: z.number().int().positive()
}).strict();

export const exportLayoutSchema = z
  .object({
    theme: z.enum(["LIGHT", "DARK"]),
    showNotation: z.boolean(),
    slideSize: z.enum(["LAYOUT_WIDE", "LAYOUT_4X3", "16:9", "4:3"]),
    textSizePreset: z.enum(["SMALL", "MEDIUM", "LARGE", "CUSTOM"]).default("MEDIUM"),
    customLayout: customLayoutSchema.optional()
  })
  .strict();

export const exportOutputSchema = z
  .object({
    fileName: nonEmptyTextField.optional(),
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional()
  })
  .strict()
  .optional();

export const exportPayloadSchema = z
  .object({
    slides: z.array(exportSlideSchema).min(1),
    layout: exportLayoutSchema,
    output: exportOutputSchema
  })
  .strict();

export type ExportPayload = z.infer<typeof exportPayloadSchema>;

export function formatValidationIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "payload",
    message: issue.message
  }));
}
