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

const markdown = new Marked({ async: false, gfm: true, breaks: false })
markdown.use({
  renderer: {
    html(token) {
      return escapeHtml(token?.raw ?? token?.text ?? token ?? '')
    },
  },
})

/** A text as one or more paragraphs. */
export function renderBlock(text) {
  return markdown.parse(String(text ?? ''))
}

/** A text without the surrounding paragraph, for a heading or a table cell. */
export function renderInline(text) {
  return markdown.parseInline(String(text ?? ''))
}
