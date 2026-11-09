const DIRECTORY_HOSTS = ["findtreatment.gov", "npiregistry.cms.hhs.gov", "va.gov"];

/** Use only source-supplied public web addresses, never guesses or directory homepages. */
export function providerHomepage(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const value = raw.trim();
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.endsWith(".local") || host.endsWith(".localhost")) return null;
    if (DIRECTORY_HOSTS.some((directory) => host === directory || host.endsWith(`.${directory}`))) return null;
    return `${url.origin}/`;
  } catch { return null; }
}

export function communityHomepage(row: { kind: string; provider_website?: string | null; source_url: string }): string | null {
  if (row.kind.includes("VA") || row.kind === "Vet Center") return null;
  // Older FindTreatment snapshots used the provider website as their source URL.
  return providerHomepage(row.provider_website) ?? providerHomepage(row.source_url);
}