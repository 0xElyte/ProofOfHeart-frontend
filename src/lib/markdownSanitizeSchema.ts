import type { Schema } from "hast-util-sanitize";

/** Protocol and tag restrictions applied on top of rehype-sanitize defaults. */
export const MARKDOWN_SANITIZE_OVERRIDES: Partial<Schema> = {
  allowComments: false,
  protocols: {
    cite: ["http", "https"],
    href: ["http", "https", "mailto"],
    longDesc: ["http", "https"],
    src: ["http", "https"],
  },
};

/**
 * Merge GitHub-style defaults with ProofOfHeart-specific hardening.
 * Called from SafeMarkdown at runtime so Jest can mock rehype-sanitize in integration tests.
 */
export function buildMarkdownSanitizeSchema(defaultSchema: Schema): Schema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanAttributes = (attrs: Array<string | [string, ...any[]]>) => {
    return attrs.filter((attr) => {
      if (typeof attr === "string") {
        return !attr.toLowerCase().startsWith("on");
      }
      if (Array.isArray(attr) && typeof attr[0] === "string") {
        return !attr[0].toLowerCase().startsWith("on");
      }
      return true;
    });
  };

  const mergedAttributes = {
    ...defaultSchema.attributes,
    ...MARKDOWN_SANITIZE_OVERRIDES.attributes,
  };

  const attributes = Object.fromEntries(
    Object.entries(mergedAttributes).map(([tag, attrs]) => [
      tag,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanAttributes(attrs as Array<string | [string, ...any[]]>),
    ]),
  );

  const mergedProtocols = {
    ...defaultSchema.protocols,
    ...MARKDOWN_SANITIZE_OVERRIDES.protocols,
  };

  const protocols = Object.fromEntries(
    Object.entries(mergedProtocols).map(([key, list]) => [
      key,
      (list ?? []).filter((proto) => {
        const lower = proto.toLowerCase();
        return lower !== "javascript" && lower !== "data" && lower !== "vbscript";
      }),
    ]),
  );

  return {
    ...defaultSchema,
    ...MARKDOWN_SANITIZE_OVERRIDES,
    protocols,
    attributes,
  };
}
