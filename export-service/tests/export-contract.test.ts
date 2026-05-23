import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { PNG } from "pngjs";
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

  it("generates a PNG ZIP for a valid PNG export payload", async () => {
    const response = await request(app)
      .post("/export/png")
      .buffer(true)
      .parse(binaryParser)
      .send(validPayload);

    assert.equal(response.status, 200);
    assert.match(response.headers["content-type"], /application\/zip/);
    assert.match(response.headers["content-disposition"], /attachment; filename="KJ 37 - Bila Kurenung Dosaku\.zip"/);

    const zip = await JSZip.loadAsync(response.body);
    const pngFiles = Object.keys(zip.files).filter((path) => /^slide-\d{3}\.png$/.test(path));
    assert.deepEqual(pngFiles, ["slide-001.png"]);

    const pngBuffer = await zip.file("slide-001.png")?.async("nodebuffer");
    assert.ok(pngBuffer);
    assert.equal(pngBuffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

    const image = PNG.sync.read(pngBuffer);
    assert.equal(image.width, 1920);
    assert.equal(image.height, 1080);
    assert.ok(countNonWhitePixels(image) > 1000);
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

  it("generates one PNG per submitted slide with deterministic dimensions", async () => {
    const response = await request(app)
      .post("/export/png")
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
          fileName: "selected-verse-images"
        }
      });

    assert.equal(response.status, 200);
    assert.match(response.headers["content-disposition"], /filename="selected-verse-images\.zip"/);

    const zip = await JSZip.loadAsync(response.body);
    const pngFiles = Object.keys(zip.files).filter((path) => /^slide-\d{3}\.png$/.test(path));
    assert.deepEqual(pngFiles, ["slide-001.png", "slide-002.png"]);

    for (const fileName of pngFiles) {
      const pngBuffer = await zip.file(fileName)?.async("nodebuffer");
      assert.ok(pngBuffer);
      const image = PNG.sync.read(pngBuffer);
      assert.equal(image.width, 1920);
      assert.equal(image.height, 1080);
    }
  });

  it("generates PNG output for the dark theme", async () => {
    const response = await request(app)
      .post("/export/png")
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
    const zip = await JSZip.loadAsync(response.body);
    const pngBuffer = await zip.file("slide-001.png")?.async("nodebuffer");
    assert.ok(pngBuffer);
    assert.equal(pngBuffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  });

  it("generates clipped or wrapped PNG output for long text", async () => {
    const response = await request(app)
      .post("/export/png")
      .buffer(true)
      .parse(binaryParser)
      .send({
        ...validPayload,
        slides: [
          {
            title: "KJ 37 - Bila Kurenung Dosaku dengan judul yang sangat panjang untuk menguji batas aman slide",
            subtitle: "Ayat 1 dengan keterangan tambahan yang panjang",
            metadata: "Do = G | 4 ketuk | tempo sedang | catatan panjang",
            lines: [
              {
                notation: "5 .6 5 5 6 | 1 .2 1 .6 | 5 .6 5 5 6 | 1 .2 1 .6",
                lyric: "Bi-la ku-re-nung do-sa-ku yang pan-jang se-ka-li un-tuk di-u-ji da-lam slide"
              },
              {
                notation: "1 .2 3 3 2 | 3...0 | 1 .2 3 3 2 | 3...0",
                lyric: "Ka-sih sa-yang-Mu me-nun-tun lang-kah hi-dup-ku se-tiap wak-tu"
              }
            ]
          }
        ]
      });

    assert.equal(response.status, 200);

    const zip = await JSZip.loadAsync(response.body);
    const pngBuffer = await zip.file("slide-001.png")?.async("nodebuffer");
    assert.ok(pngBuffer);
    const image = PNG.sync.read(pngBuffer);
    assert.equal(image.width, 1920);
    assert.equal(image.height, 1080);
    assert.ok(countNonWhitePixels(image) > 1000);
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

function countNonWhitePixels(image: PNG): number {
  let count = 0;

  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];

    if (red < 250 || green < 250 || blue < 250) {
      count += 1;
    }
  }

  return count;
}
