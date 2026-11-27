import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  adaptFetchText,
  hasPropertiesBlock,
  isFetchEnvelope,
} from "../src/validate/notion-fetch-input.ts";
import { normalizeCliInput } from "../src/validate/normalize-input.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envelopeRaw = readFileSync(
  join(root, "test/fixtures/notion-fetch-result.json"),
  "utf8",
);
const envelope = JSON.parse(envelopeRaw);
const block = /<properties>[\s\S]*?<\/properties>/.exec(envelope.text)[0];

describe("notion-fetch adapter", () => {
  it("recognizes an envelope only when string text carries a properties block", () => {
    expect(isFetchEnvelope(envelope)).toBe(true);
    expect(isFetchEnvelope({ text: "no block here" })).toBe(false);
    expect(isFetchEnvelope({ text: 1 })).toBe(false);
    expect(isFetchEnvelope(null)).toBe(false);
    expect(isFetchEnvelope([envelope])).toBe(false);
    expect(hasPropertiesBlock(block)).toBe(true);
  });

  it("extracts the properties map from raw text without inventing page_id", () => {
    const result = adaptFetchText(envelope.text);
    expect(result.ok).toBe(true);
    expect(result.input.persisted.Repository).toBe(
      "multipliers-dev/savepoints-lite",
    );
    expect("page_id" in result.input).toBe(false);
  });

  it("keeps page_id only when an explicit string is supplied", () => {
    expect(adaptFetchText(block, "abc").input.page_id).toBe("abc");
    expect("page_id" in adaptFetchText(block, 42).input).toBe(false);
    expect("page_id" in adaptFetchText(block, "  ").input).toBe(false);
  });

  it("fails closed on missing or broken blocks", () => {
    expect(adaptFetchText("nothing").ok).toBe(false);
    expect(adaptFetchText("<properties>{not json}</properties>").ok).toBe(false);
    expect(adaptFetchText("<properties>[1,2]</properties>").ok).toBe(false);
    expect(adaptFetchText("<properties>\"str\"</properties>").ok).toBe(false);
  });
});

describe("normalizeCliInput", () => {
  it("passes structured input through unchanged", () => {
    const structured = { persisted: { Name: "n" }, page_id: "p" };
    const result = normalizeCliInput(JSON.stringify(structured));
    expect(result).toEqual({ ok: true, input: structured });
  });

  it("passes structured input through even when persisted is malformed", () => {
    // Classification only; the core validator reports the invalid shape.
    const result = normalizeCliInput(JSON.stringify({ persisted: "x" }));
    expect(result).toEqual({ ok: true, input: { persisted: "x" } });
  });

  it("normalizes a fetch envelope to the canonical shape with its page_id", () => {
    const result = normalizeCliInput(envelopeRaw);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.input).sort()).toEqual(["page_id", "persisted"]);
    expect(result.input.page_id).toBe(envelope.page_id);
    expect(result.input.persisted.Agent).toBe("Cursor Agent");
  });

  it("normalizes raw text containing a properties block", () => {
    const result = normalizeCliInput(`some text\n${block}\nmore text`);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.input)).toEqual(["persisted"]);
  });

  it("falls through to the adapter when JSON.parse fails", () => {
    expect(normalizeCliInput(block).ok).toBe(true);
  });

  it("rejects JSON that is neither structured nor an envelope", () => {
    expect(normalizeCliInput("{}").ok).toBe(false);
    expect(normalizeCliInput('{"text":"no block"}').ok).toBe(false);
    expect(normalizeCliInput('["x"]').ok).toBe(false);
    expect(normalizeCliInput("null").ok).toBe(false);
    expect(normalizeCliInput("42").ok).toBe(false);
  });

  it("rejects an envelope whose block is broken", () => {
    const broken = JSON.stringify({
      text: "<properties>{oops}</properties>",
    });
    expect(normalizeCliInput(broken).ok).toBe(false);
  });

  it("rejects text with no JSON and no block", () => {
    expect(normalizeCliInput("hello").ok).toBe(false);
    expect(normalizeCliInput("").ok).toBe(false);
  });
});
