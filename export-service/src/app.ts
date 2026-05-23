import express, { type ErrorRequestHandler, type RequestHandler } from "express";
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
  app.post("/export/png", createPngExportStubHandler());

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

function createPngExportStubHandler(): RequestHandler {
  return (request, response) => {
    const parsed = exportPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      sendValidationError(response, parsed.error);
      return;
    }

    response.status(202).json({
      status: "NOT_IMPLEMENTED",
      code: "RENDERING_NOT_IMPLEMENTED",
      message: "PNG rendering is not implemented in issue #16.",
      format: "PNG",
      slideCount: parsed.data.slides.length
    });
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
