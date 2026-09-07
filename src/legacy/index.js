// The legacy URL mappings the four DXA sites decode from `backward_compatibility`
// — near-identically, because nothing shared did it before this. Pure, no Vue:
// a site's own composable stays the reactive wrapper around its own
// `partners` / `countries` / `items` refs, and hands this module plain lists.
// It is a separate entry point rather than part of the package root because
// only a site built against DXA's legacy URL shapes needs it — the standalone
// sites never import it.

/**
 * A partner's legacy identity, `{ legacyId, countryCode }`, read from its
 * `backward_compatibility`.
 *
 * The DXA sites carry `mwnf3:museums:Mus21:ua` — the third and fourth
 * colon-separated segments are the legacy id and the two-letter country
 * code. Sharing History keys its partners differently —
 * `mwnf3_sharing_history:sh_partners:at_01_d` has no country segment at
 * all; the country is the key's own prefix, so that shape is decoded apart
 * rather than by segment index. `countries` (a country's own `code`, its
 * `backward_compatibility`) is the fallback for a partner carrying no
 * `backward_compatibility` at all: its `country_id` resolved to the same
 * two-letter code, so a package still missing the legacy key can be routed
 * by the country a visitor is already on.
 */
export function partnerKey(partner, countries = []) {
  const parts = String(partner?.backward_compatibility ?? '').split(':')
  if (parts[0] === 'mwnf3_sharing_history') {
    const key = parts[2] ?? partner?.id ?? ''
    return { legacyId: key, countryCode: key.split('_')[0] ?? '' }
  }
  if (parts.length > 1) {
    return { legacyId: parts[2] ?? partner?.id ?? '', countryCode: parts[3] ?? '' }
  }
  const country = countries.find((c) => c.id === partner?.country_id)
  return { legacyId: partner?.id ?? '', countryCode: country?.code ?? '' }
}

/**
 * The partner a legacy `/partner/:country/:id` route names, or null — the
 * reverse of `partnerKey`, scanning `partners` for the one whose key
 * matches both parts.
 */
export function partnerFromKey(partners, countries, countryCode, legacyId) {
  return (partners ?? []).find((partner) => {
    const key = partnerKey(partner, countries)
    return key.legacyId === legacyId && key.countryCode === countryCode
  }) ?? null
}

/**
 * The item a legacy dbUid *path* names, or null. The public item URL keeps
 * the dbUid path, which is exactly `backward_compatibility` with `:`
 * swapped for `/` — matched case-insensitively, because Sharing History
 * stores its keys lowercase.
 */
export function itemFromUidPath(items, path) {
  const needle = String(path ?? '').split('/').join(':').toLowerCase()
  return (items ?? []).find((item) => item?.backward_compatibility?.toLowerCase() === needle) ?? null
}
