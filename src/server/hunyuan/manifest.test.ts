import { describe, expect, it } from "vitest";
import {
  MODEL_NAME,
  REFERENCE_VIEW_ORDER,
  buildSubmission,
  expectedGlbPath,
  findGlbPath,
  isReferenceView,
  orderViews,
  validateViews,
} from "./manifest";
import { ReferenceView } from "@/lib/enums";

const bytes = (n: number) => new Uint8Array([n]);

describe("hunyuan/manifest", () => {
  describe("isReferenceView", () => {
    it("accepts the four canonical tags only", () => {
      expect(isReferenceView("front")).toBe(true);
      expect(isReferenceView("left")).toBe(true);
      expect(isReferenceView("back")).toBe(true);
      expect(isReferenceView("right")).toBe(true);
      expect(isReferenceView("top")).toBe(false);
      expect(isReferenceView("FRONT")).toBe(false);
    });
  });

  describe("validateViews", () => {
    it("requires front", () => {
      expect(validateViews(["left", "back"]).ok).toBe(false);
    });

    it("accepts front alone and front plus optional views", () => {
      expect(validateViews(["front"]).ok).toBe(true);
      expect(validateViews(["front", "left", "back", "right"]).ok).toBe(true);
    });

    it("rejects empty, too many, and unknown tags", () => {
      expect(validateViews([]).ok).toBe(false);
      expect(validateViews(["front", "left", "back", "right", "front"]).ok).toBe(false);
      expect(validateViews(["front", "top"]).ok).toBe(false);
    });
  });

  describe("orderViews", () => {
    it("returns canonical front/left/back/right order regardless of insertion order", () => {
      const ordered = orderViews({
        [ReferenceView.BACK]: bytes(3),
        [ReferenceView.FRONT]: bytes(1),
        [ReferenceView.RIGHT]: bytes(4),
      });
      expect(ordered.map((v) => v.tag)).toEqual(["front", "back", "right"]);
    });
  });

  describe("buildSubmission", () => {
    it("builds a manifest-less single-view submission named model.jpg", () => {
      const submission = buildSubmission([{ tag: ReferenceView.FRONT, bytes: bytes(1) }]);
      expect(submission.mode).toBe("single");
      expect(submission.quality).toBe("max");
      expect(submission.manifest).toBeNull();
      expect(submission.files).toEqual([{ filename: "model.jpg", bytes: bytes(1) }]);
    });

    it("builds a multiview manifest with staged <name>__<tag>.jpg basenames", () => {
      const submission = buildSubmission([
        { tag: ReferenceView.FRONT, bytes: bytes(1) },
        { tag: ReferenceView.LEFT, bytes: bytes(2) },
      ]);
      expect(submission.mode).toBe("mv");
      expect(submission.files.map((f) => f.filename)).toEqual([
        "model__front.jpg",
        "model__left.jpg",
      ]);
      expect(JSON.parse(submission.manifest as string)).toEqual({
        models: [
          {
            name: MODEL_NAME,
            views: { front: "model__front.jpg", left: "model__left.jpg" },
          },
        ],
      });
    });

    it("references every uploaded file exactly once", () => {
      const submission = buildSubmission([
        { tag: ReferenceView.FRONT, bytes: bytes(1) },
        { tag: ReferenceView.BACK, bytes: bytes(2) },
        { tag: ReferenceView.RIGHT, bytes: bytes(3) },
      ]);
      const manifest = JSON.parse(submission.manifest as string);
      const referenced = new Set(Object.values(manifest.models[0].views));
      expect(referenced.size).toBe(submission.files.length);
      for (const file of submission.files) {
        expect(referenced.has(file.filename)).toBe(true);
      }
    });

    it("throws when front is missing", () => {
      expect(() => buildSubmission([{ tag: ReferenceView.LEFT, bytes: bytes(1) }])).toThrow();
    });
  });

  describe("expectedGlbPath", () => {
    it("keys the output by run id and model name", () => {
      expect(expectedGlbPath("run_20260101_120000")).toBe(
        "run_20260101_120000/model_textured.glb",
      );
    });
  });

  describe("findGlbPath", () => {
    it("prefers the exact model name", () => {
      const files = [
        { path: "run_1/other_textured.glb" },
        { path: "run_1/model_textured.glb" },
      ];
      expect(findGlbPath(files)).toBe("run_1/model_textured.glb");
    });

    it("falls back to a lone textured glb", () => {
      expect(findGlbPath([{ path: "run_1/model_textured.glb" }])).toBe(
        "run_1/model_textured.glb",
      );
    });

    it("returns null when ambiguous or absent", () => {
      expect(findGlbPath([])).toBeNull();
      expect(
        findGlbPath([{ path: "run_1/a_textured.glb" }, { path: "run_1/b_textured.glb" }]),
      ).toBeNull();
    });
  });

  it("exposes the canonical view order", () => {
    expect(REFERENCE_VIEW_ORDER).toEqual(["front", "left", "back", "right"]);
  });
});