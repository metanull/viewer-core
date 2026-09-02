import { Marked } from 'marked'

// One Markdown pipeline for every text on every website, configured here and
// nowhere else. Its own instance rather than the shared `marked` singleton, so
// configuring it cannot change how a website renders anything else.
//
// Raw HTML is escaped rather than rendered. Texts are written by translators
// through the GitHub web interface, and the rules they are given say Markdown
// only; escaping is what makes that a guarantee instead of a request.
//
// This is the only place that guarantee lives. viewer-i18n's checker used to
// reject HTML too, which added nothing here and was wrong about autolinks and
// code spans; it no longer looks. Anything relaxed in this file is relaxed
// everywhere, with nothing behind it.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => ESCAPES[character])
}

// Raw HTML is escaped in both, because both render text that came from
// somewhere else: a translator's file, or a museum record carried in from the
// legacy system. Neither is a place markup may be authored.
const escaping = {
  renderer: {
    html(token) {
      return escapeHtml(token?.raw ?? token?.text ?? token ?? '')
    },
  },
}

// `breaks` is the one difference, and it is a difference in the source rather
// than in policy. A text in the dictionary is written as prose and wraps freely,
// so a single newline means nothing. A record's field arrives from a database
// where a newline was typed to be a line break, and dropping it runs the lines
// together.
const prose = new Marked({ async: false, gfm: true, breaks: false })
const record = new Marked({ async: false, gfm: true, breaks: true })
prose.use(escaping)
record.use(escaping)

const pipeline = (breaks) => (breaks ? record : prose)

/** A text as one or more paragraphs. */
export function renderBlock(text, { breaks = false } = {}) {
  return pipeline(breaks).parse(String(text ?? ''))
}

/** A text without the surrounding paragraph, for a heading or a table cell. */
export function renderInline(text, { breaks = false } = {}) {
  return pipeline(breaks).parseInline(String(text ?? ''))
}
