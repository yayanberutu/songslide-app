import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

  it("accepts a valid PPTX export payload and returns a stub response", async () => {
    const response = await request(app)
      .post("/export/pptx")
      .send(validPayload);

    assert.equal(response.status, 202);
    assert.equal(response.body.status, "NOT_IMPLEMENTED");
    assert.equal(response.body.code, "RENDERING_NOT_IMPLEMENTED");
    assert.equal(response.body.format, "PPTX");
    assert.equal(response.body.slideCount, 1);
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
