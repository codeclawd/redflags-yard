export type Field = "paste" | "url";

export type ScanSource = { kind: "paste"; text: string } | { kind: "url"; url: string };

/**
 * Which of the two bring-your-own fields gets scanned. The one the visitor
 * touched last wins; if it is empty, the other one does. A fixed precedence
 * (paste always beats the link) silently scanned a stale paste after the
 * visitor had moved on to a link.
 */
export function pickSource(pasted: string, url: string, lastEdited: Field | null): ScanSource | null {
  const paste: ScanSource | null = pasted.trim().length > 0 ? { kind: "paste", text: pasted } : null;
  const link: ScanSource | null = url.trim().length > 0 ? { kind: "url", url: url.trim() } : null;
  return lastEdited === "url" ? (link ?? paste) : (paste ?? link);
}
