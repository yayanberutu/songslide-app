import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { buildPngZipFileName, generatePngZip, PNG_ZIP_MIME_TYPE } from "./png-exporter";
import { buildPptxFileName, generatePptx, PPTX_MIME_TYPE } from "./pptx-exporter";
import { exportPayloadSchema, formatValidationIssues } from "./schemas";

interface CreateAppOptions {
  enableRequestLogging?: boolean;
}

const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = Date.now();

  response.on("finish", () => {
    console.log(JSON.stringify({
      level: "info",
      event: "http_request",
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });

  next();
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const enableRequestLogging = options.enableRequestLogging ?? process.env.NODE_ENV !== "test";

  if (enableRequestLogging) {
    app.use(requestLogger);
  }

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "songslide-export-service"
    });
  });

  app.post("/export/pptx", createPptxExportHandler());
  app.post("/export/png", createPngExportHandler());

  app.use(jsonErrorHandler);

  return app;
}

function createPptxExportHandler(): RequestHandler {
  return async (request, response, next) => {
    const parsed = exportPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      sendValidationError(response, parsed.error);
      return;
    }

    try {
      const buffer = await generatePptx(parsed.data);
      const fileName = buildPptxFileName(parsed.data);

      response
        .status(200)
        .setHeader("Content-Type", PPTX_MIME_TYPE)
        .setHeader("Content-Disposition", `attachment; filename="${fileName.replace(/"/g, "")}"`)
        .setHeader("Content-Length", buffer.length.toString())
        .send(buffer);
    } catch (error) {
      next(error);
    }
  };
}

function createPngExportHandler(): RequestHandler {
  return async (request, response, next) => {
    const parsed = exportPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      sendValidationError(response, parsed.error);
      return;
    }

    try {
      const buffer = await generatePngZip(parsed.data);
      const fileName = buildPngZipFileName(parsed.data);

      response
        .status(200)
        .setHeader("Content-Type", PNG_ZIP_MIME_TYPE)
        .setHeader("Content-Disposition", `attachment; filename="${fileName.replace(/"/g, "")}"`)
        .setHeader("Content-Length", buffer.length.toString())
        .send(buffer);
    } catch (error) {
      next(error);
    }
  };
}

function sendValidationError(response: express.Response, error: Parameters<typeof formatValidationIssues>[0]) {
  response.status(400).json({
    status: "FAILED",
    code: "VALIDATION_ERROR",
    message: "Invalid export payload",
    issues: formatValidationIssues(error)
  });
}

const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({
      status: "FAILED",
      code: "MALFORMED_JSON",
      message: "Malformed JSON request body",
      issues: []
    });
    return;
  }

  next(error);
};
