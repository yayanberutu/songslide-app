import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExportRenderPlan, createLayoutTokens } from "../src/export-layout";

const surface = {
  width: 1920,
  height: 1080
};

const crowdedSlidePayload = {
  slides: [
    {
      title: "KJ 4 - Allah Beserta Kita",
      subtitle: "Ayat 1",
      metadata: "Do = G | 4 ketuk",
      lines: Array.from({ length: 10 }, (_, index) => ({
        notation: index % 2 === 0
          ? "[3] | [(5 4) 3] | [(3 2) 1] [1 . .] [7 . 2] | ([1 . .] 1)"
          : "5 .6 5 5 6 | 1 .2 1 .6 | [5 4 3] | (2 1 7)",
        lyric: index % 2 === 0
          ? "Ku i ngin me nye rah kan se lu"
          : "Bi-la ku-re-nung do-sa-ku"
      }))
    }
  ],
  layout: {
    theme: "LIGHT" as const,
    showNotation: true,
    slideSize: "LAYOUT_WIDE" as const,
    textSizePreset: "MEDIUM" as const
  }
};

describe("export layout", () => {
  it("scales layout tokens by text size preset", () => {
    const small = createLayoutTokens(surface, "SMALL");
    const medium = createLayoutTokens(surface, "MEDIUM");
    const large = createLayoutTokens(surface, "LARGE");

    assert.ok(small.titleFontSize < medium.titleFontSize);
    assert.ok(large.titleFontSize > medium.titleFontSize);
    assert.ok(small.renderMetrics.lyricFontSize < medium.renderMetrics.lyricFontSize);
    assert.ok(large.renderMetrics.noteFontSize > medium.renderMetrics.noteFontSize);
    assert.ok(large.bodyGap > medium.bodyGap);
  });

  it("adds page labels when a slide is paginated", () => {
    const plan = buildExportRenderPlan(
      {
        ...crowdedSlidePayload,
        layout: {
          ...crowdedSlidePayload.layout,
          textSizePreset: "LARGE"
        }
      },
      surface
    );

    assert.ok(plan.pages.length >= 2);
    assert.match(plan.pages[0]?.subtitle ?? "", /Ayat 1 - slide 1\/\d+/);
    assert.match(plan.pages[1]?.subtitle ?? "", /Ayat 1 - slide 2\/\d+/);
  });

  it("fits more content per page with SMALL than LARGE", () => {
    const smallPlan = buildExportRenderPlan(
      {
        ...crowdedSlidePayload,
        layout: {
          ...crowdedSlidePayload.layout,
          textSizePreset: "SMALL"
        }
      },
      surface
    );
    const largePlan = buildExportRenderPlan(
      {
        ...crowdedSlidePayload,
        layout: {
          ...crowdedSlidePayload.layout,
          textSizePreset: "LARGE"
        }
      },
      surface
    );

    assert.ok((smallPlan.pages[0]?.lines.length ?? 0) > (largePlan.pages[0]?.lines.length ?? 0));
    assert.ok(smallPlan.pages.length <= largePlan.pages.length);
  });
});
