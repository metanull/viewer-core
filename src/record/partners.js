// Seven partner lists group by country seven ways. The standalone sites
// (islamicart, baroqueart, sharinghistory) bucket each country's partners
// into "main" and "associated" on a `level` field and render an accordion;
// the DXA sites (carpets and its siblings) group the same way but add an
// A-Z / Z-A toggle and no tiers at all. Both are this one derivation with a
// couple of options — pure, so the site's own view supplies the toggle and
// the label lookup.
//
// `parent_id` is carried on a third of the standalone partners and read
// nowhere: legacy nested an associated partner under the main partner it
// belongs to, and the port flattened that into the country column instead.
// `partnerHierarchy` is that relationship, read once.

/**
 * Whether `record` counts as a main (rather than associated) partner.
 * `tier` names the field the converged partner shape carries (`level`).
 * A record is associated only when its tier value is a non-empty value
 * other than `'partner'` (legacy values: `'associated_partner'`,
 * `'minor_contributor'`); `null`, `undefined`, `''`, or `'partner'` mean
 * main. This is necessary because exporters emit `level: null` for every
 * partner without curated hierarchy. Without a `tier` at all there is nothing
 * to divide records on, so every record is main, which is what a caller with
 * no tiers (the DXA lists) wants.
 */
function isMainTier(record, tier) {
  if (!tier) return true
  const tierValue = record?.[tier]
  // Treat null, undefined, empty string, or 'partner' as main
  return tierValue == null || tierValue === '' || tierValue === 'partner'
}

/**
 * Partner records grouped by country: `[{ country, label, main, associated
 * }]`, one entry per distinct `country_id` (partners with none share a
 * `null` group), sorted by `label`, ascending unless `order: 'desc'`.
 * `label(country)` names a group's country — the caller's own lookup, the
 * same shape as a facet's `label(value)` — since a partner record carries
 * only the id. `tier` names the field that marks a main partner (see
 * `isMainTier`); without it every record lands in `main` and `associated`
 * is always empty, which covers the DXA lists' plain grouping. Partners
 * keep the relative order `records` was given in within each tier — sorting
 * them by their own label is the view's concern, not this derivation's.
 */
export function groupByCountry(records, { label, tier, order = 'asc' } = {}) {
  const groups = new Map()
  for (const record of records ?? []) {
    const country = record?.country_id ?? null
    if (!groups.has(country)) groups.set(country, { country, main: [], associated: [] })
    const group = groups.get(country)
    ;(isMainTier(record, tier) ? group.main : group.associated).push(record)
  }
  const rows = [...groups.values()].map((group) => ({ ...group, label: label ? label(group.country) : group.country }))
  rows.sort((a, b) => String(a.label).localeCompare(String(b.label)))
  return order === 'desc' ? rows.reverse() : rows
}

/**
 * The partner hierarchy `parent_id` encodes: `children(id)` (a partner's
 * associated partners), `parentOf(id)` (the main partner it belongs to, or
 * null), `roots` (every partner with no parent in the list, or whose
 * `parent_id` points outside it). A partner referencing a `parent_id` this
 * list does not carry is treated as a root rather than dropped — the same
 * "keep the reference, don't invent or discard" rule `relatedRecords` uses.
 */
export function partnerHierarchy(partners) {
  const list = partners ?? []
  const byId = new Map(list.map((partner) => [partner.id, partner]))
  const childrenOf = new Map()
  const roots = []
  for (const partner of list) {
    const parent = partner?.parent_id != null ? byId.get(partner.parent_id) : null
    if (parent) {
      if (!childrenOf.has(parent.id)) childrenOf.set(parent.id, [])
      childrenOf.get(parent.id).push(partner)
    } else {
      roots.push(partner)
    }
  }
  return {
    children: (id) => childrenOf.get(id) ?? [],
    parentOf: (id) => {
      const partner = byId.get(id)
      return partner?.parent_id != null ? (byId.get(partner.parent_id) ?? null) : null
    },
    roots,
  }
}
