import { describe, it, expect } from "vitest";
import { sanitizeRichText, stripRichTags, richTextLength } from "./rich-text";

describe("sanitizeRichText", () => {
  it("keeps a simple color-only span", () => {
    expect(sanitizeRichText('<span style="color: #c9a96e;">Hi</span>')).toBe('<span style="color:#c9a96e">Hi</span>');
  });

  it("keeps a simple background-color-only span", () => {
    expect(sanitizeRichText('<span style="background-color: rgb(221, 177, 95);">Hi</span>'))
      .toBe('<span style="background-color:rgb(221, 177, 95)">Hi</span>');
  });

  it("handles a single span combining color AND background-color (highlight + text color on the same selection)", () => {
    const input = '<span style="color: rgb(207, 178, 125); background-color: rgb(221, 177, 95);">Expérience</span>';
    const result = sanitizeRichText(input);
    // Ne doit JAMAIS contenir de balise échappée en texte littéral (le bug corrigé).
    expect(result).not.toContain("&lt;");
    expect(result).not.toContain("&gt;");
    expect(result).toBe('<span style="color:rgb(207, 178, 125);background-color:rgb(221, 177, 95)">Expérience</span>');
  });

  it("handles the two properties in reversed order", () => {
    const input = '<span style="background-color: #e2ddd8; color: #1c1917;">Hi</span>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain("&lt;");
    expect(result).toBe('<span style="background-color:#e2ddd8;color:#1c1917">Hi</span>');
  });

  it("drops an unrecognized/unsafe color value but keeps the text", () => {
    const result = sanitizeRichText('<span style="color: url(javascript:alert(1));">Hi</span>');
    expect(result).toBe("<span>Hi</span>");
  });

  it("is idempotent — sanitizing an already-sanitized combined span twice yields the same result", () => {
    const once = sanitizeRichText('<span style="color: rgb(207, 178, 125); background-color: rgb(221, 177, 95);">Expérience</span>');
    const twice = sanitizeRichText(once);
    expect(twice).toBe(once);
  });

  it("escapes a bare stray angle bracket outside any recognized tag", () => {
    expect(sanitizeRichText("5 < 10")).toBe("5 &lt; 10");
  });

  it("normalizes <font color> to the equivalent span", () => {
    expect(sanitizeRichText('<font color="#ff0000">Hi</font>')).toBe('<span style="color:#ff0000">Hi</span>');
  });
});

describe("stripRichTags / richTextLength", () => {
  it("strips a combined color+background-color span down to plain text", () => {
    const input = '<span style="color: rgb(207, 178, 125); background-color: rgb(221, 177, 95);">Expérience</span>';
    expect(stripRichTags(input)).toBe("Expérience");
    expect(richTextLength(input)).toBe(10);
  });
});
