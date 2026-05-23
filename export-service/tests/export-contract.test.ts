import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import type SuperAgentResponse from "superagent/lib/node/response";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp({ enableRequestLogging: false });

const validPayload = {
  slides: [
    {
      title: "KJ 37 - Bila Kurenung Dosaku",
      subtitle: "Ayat 1",
      metadata: "Do = G | 4 ketuk",
      lines: [
        {
          notation: "5 .6 5 5 6 | 1 .2 1 .6",
          lyric: "Bi-la ku-re-nung do-sa-ku"
        }
      ]
    }
  ],
  layout: {
    theme: "LIGHT",
    showNotation: true,
    slideSize: "LAYOUT_WIDE"
  }
};

describe("export service contract", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      status: "ok",
      service: "songslide-export-service"
    });
  });

  it("generates a PPTX binary for a valid PPTX export payload", async () => {
    const response = await request(app)
      .post("/export/pptx")
      .buffer(true)
      .parse(binaryParser)
      .send(validPayload);

    assert.equal(response.status, 200);
    assert.match(response.headers["content-type"], /application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation/);
    assert.match(response.headers["content-disposition"], /attachment; filename="KJ 37 - Bila Kurenung Dosaku\.pptx"/);
    assert.ok(Buffer.isBuffer(response.body));
    assert.equal(response.body.subarray(0, 2).toString(), "PK");

    const zip = await JSZip.loadAsync(response.body);
    const slideFiles = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
    assert.equal(slideFiles.length, 1);

    const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");
    assert.ok(slideXml?.includes("KJ 37 - Bila Kurenung Dosaku"));
    assert.ok(slideXml?.includes("5 .6 5 5 6 | 1 .2 1 .6"));
    assert.ok(slideXml?.includes("Bi-la ku-re-nung do-sa-ku"));
  });

  it("accepts a valid PNG export payload and returns a stub response", async () => {
    const response = await request(app)
      .post("/export/png")
      .send(validPayload);

    assert.equal(response.status, 202);
    assert.equal(response.body.status, "NOT_IMPLEMENTED");
    assert.equal(response.body.code, "RENDERING_NOT_IMPLEMENTED");
    assert.equal(response.body.format, "PNG");
    assert.equal(response.body.slideCount, 1);
  });

  it("rejects payloads without slides", async () => {
    const response = await request(app)
      .post("/export/pptx")
      .send({
        layout: validPayload.layout
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.status, "FAILED");
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.ok(response.body.issues.some((issue: { path: string }) => issue.path === "slides"));
  });

  it("generates only the submitted PPTX slides", async () => {
    const response = await request(app)
      .post("/export/pptx")
      .buffer(true)
      .parse(binaryParser)
      .send({
        ...validPayload,
        slides: [
          validPayload.slides[0],
          {
            title: "KJ 37 - Bila Kurenung Dosaku",
            subtitle: "Ayat 2",
            metadata: "Do = G | 4 ketuk",
            lines: [
              {
                notation: "1 .2 3 3 2 | 3...0",
                lyric: "Ra-sa ang-kuh dan som-bong-ku"
              }
            ]
          }
        ],
        output: {
          fileName: "selected-verses"
        }
      });

    assert.equal(response.status, 200);
    assert.match(response.headers["content-disposition"], /filename="selected-verses\.pptx"/);

    const zip = await JSZip.loadAsync(response.body);
    const slideFiles = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
    assert.equal(slideFiles.length, 2);
  });

  it("generates a PPTX for the dark theme", async () => {
    const response = await request(app)
      .post("/export/pptx")
      .buffer(true)
      .parse(binaryParser)
      .send({
        ...validPayload,
        layout: {
          ...validPayload.layout,
          theme: "DARK"
        }
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.subarray(0, 2).toString(), "PK");
  });

  it("rejects malformed slide lines", async () => {
    const response = await request(app)
      .post("/export/png")
      .send({
        ...validPayload,
        slides: [
          {
            title: "KJ 37 - Bila Kurenung Dosaku",
            lines: [{}]
          }
        ]
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.status, "FAILED");
    assert.ok(response.body.issues.some((issue: { path: string; message: string }) => (
      issue.path === "slides.0.lines.0" && issue.message === "line must include notation or lyric"
    )));
  });

  it("rejects malformed JSON bodies", async () => {
    const response = await request(app)
      .post("/export/pptx")
      .set("Content-Type", "application/json")
      .send("{ invalid json");

    assert.equal(response.status, 400);
    assert.equal(response.body.status, "FAILED");
    assert.equal(response.body.code, "MALFORMED_JSON");
    assert.equal(response.body.message, "Malformed JSON request body");
  });
});

function binaryParser(
  response: SuperAgentResponse,
  callback: (error: Error | null, body?: Buffer) => void
): void {
  const chunks: Buffer[] = [];

  response.on("data", (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  response.on("end", () => callback(null, Buffer.concat(chunks)));
  response.on("error", (error: Error) => callback(error));
}
