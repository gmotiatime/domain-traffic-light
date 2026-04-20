import { describe, expect, it } from "vitest";
import {
  heroVideo,
  navItems,
  homeManifest,
  homeProof,
  behaviorSteps,
  ruleReference,
  officialDomains,
  methodBlocks,
  safetyPrinciples,
  officialRoutes,
  faqItems,
} from "./site-content";

describe("site-content", () => {
  it("should export heroVideo as a non-empty string", () => {
    expect(typeof heroVideo).toBe("string");
    expect(heroVideo.length).toBeGreaterThan(0);
  });

  it("should export navItems as a valid array", () => {
    expect(Array.isArray(navItems)).toBe(true);
    expect(navItems.length).toBeGreaterThan(0);
    navItems.forEach((item) => {
      expect(typeof item.label).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.path).toBe("string");
      expect(item.path.length).toBeGreaterThan(0);
      expect(item.path.startsWith("/")).toBe(true);
    });
  });

  it("should export homeManifest as a valid array of strings", () => {
    expect(Array.isArray(homeManifest)).toBe(true);
    expect(homeManifest.length).toBeGreaterThan(0);
    homeManifest.forEach((item) => {
      expect(typeof item).toBe("string");
      expect(item.length).toBeGreaterThan(0);
    });
  });

  it("should export homeProof as a valid array of objects", () => {
    expect(Array.isArray(homeProof)).toBe(true);
    expect(homeProof.length).toBeGreaterThan(0);
    homeProof.forEach((item) => {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    });
  });

  it("should export behaviorSteps as a valid array of objects", () => {
    expect(Array.isArray(behaviorSteps)).toBe(true);
    expect(behaviorSteps.length).toBeGreaterThan(0);
    behaviorSteps.forEach((item) => {
      expect(typeof item.step).toBe("string");
      expect(item.step.length).toBeGreaterThan(0);
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    });
  });

  it("should export ruleReference as a valid array of objects", () => {
    expect(Array.isArray(ruleReference)).toBe(true);
    expect(ruleReference.length).toBeGreaterThan(0);
    ruleReference.forEach((item) => {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.detail).toBe("string");
      expect(item.detail.length).toBeGreaterThan(0);
    });
  });

  it("should export officialDomains as a valid array of objects", () => {
    expect(Array.isArray(officialDomains)).toBe(true);
    expect(officialDomains.length).toBeGreaterThan(0);
    officialDomains.forEach((item) => {
      expect(typeof item.label).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.domain).toBe("string");
      expect(item.domain.length).toBeGreaterThan(0);
      expect(typeof item.description).toBe("string");
      expect(item.description.length).toBeGreaterThan(0);
    });
  });

  it("should export methodBlocks as a valid array of objects", () => {
    expect(Array.isArray(methodBlocks)).toBe(true);
    expect(methodBlocks.length).toBeGreaterThan(0);
    methodBlocks.forEach((item) => {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    });
  });

  it("should export safetyPrinciples as a valid array of objects", () => {
    expect(Array.isArray(safetyPrinciples)).toBe(true);
    expect(safetyPrinciples.length).toBeGreaterThan(0);
    safetyPrinciples.forEach((item) => {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    });
  });

  it("should export officialRoutes as a valid array of objects", () => {
    expect(Array.isArray(officialRoutes)).toBe(true);
    expect(officialRoutes.length).toBeGreaterThan(0);
    officialRoutes.forEach((item) => {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.href).toBe("string");
      expect(item.href.length).toBeGreaterThan(0);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    });
  });

  it("should export faqItems as a valid array of objects", () => {
    expect(Array.isArray(faqItems)).toBe(true);
    expect(faqItems.length).toBeGreaterThan(0);
    faqItems.forEach((item) => {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.text).toBe("string");
      expect(item.text.length).toBeGreaterThan(0);
    });
  });
});
