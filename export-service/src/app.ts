import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { exportPayloadSchema, formatValidationIssues } from "./schemas";

type ExportFormat = "PPTX" | "PNG";

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

  app.post("/export/pptx", createExportStubHandler("PPTX"));
  app.post("/export/png", createExportStubHandler("PNG"));

  app.use(jsonErrorHandler);

  return app;
}

function createExportStubHandler(format: ExportFormat): RequestHandler {
  return (request, response) => {
    const parsed = exportPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        status: "FAILED",
        code: "VALIDATION_ERROR",
        message: "Invalid export payload",
        issues: formatValidationIssues(parsed.error)
      });
      return;
    }

    response.status(202).json({
      status: "NOT_IMPLEMENTED",
      code: "RENDERING_NOT_IMPLEMENTED",
      message: `${format} rendering is not implemented in issue #15.`,
      format,
      slideCount: parsed.data.slides.length
    });
  };
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
