import type { FormPlaceholder } from "./form-config";
import { GOOGLE_DRIVE_URL_PREFIX } from "./colors";

export function calculateFilledCount(
  placeholders: FormPlaceholder[],
  values: Record<string, string>,
  deferred: Set<string>,
  cleared: Set<string>
): number {
  return placeholders.filter(
    (ph) =>
      !cleared.has(ph.elementId) &&
      (ph.status === "filled" || values[ph.elementId]?.trim() || deferred.has(ph.elementId))
  ).length;
}

export function buildTextResponses(
  values: Record<string, string>,
  placeholders: FormPlaceholder[]
): Record<string, string> {
  const textResponses: Record<string, string> = {};
  const placeholderMap = new Map(placeholders.map((p) => [p.elementId, p]));

  for (const [elementId, value] of Object.entries(values)) {
    const ph = placeholderMap.get(elementId);
    if (
      !ph ||
      ph.clientResponse === value ||
      value.startsWith(GOOGLE_DRIVE_URL_PREFIX) ||
      !value.trim()
    ) {
      continue;
    }
    textResponses[elementId] = value;
  }
  return textResponses;
}
