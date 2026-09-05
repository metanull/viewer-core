import { describe, expect, it } from 'vitest'
import { renderBlock, renderInline, renderPlain } from '../src/index.js'

// A data package holds Markdown, and the importer is what converts the legacy
// HTML on the way in. These are the only places a text becomes HTML on any
// website, so this is where that stays true: a tag that slipped past the
// importer must appear on the page as the characters it is, never as markup.

describe('rendering a record field', () => {
  it('renders Markdown', () => {
    expect(renderBlock('A **bold** claim.')).toContain('<strong>bold</strong>')
    expect(renderInline('A **bold** claim.')).toBe('A <strong>bold</strong> claim.')
  })

  it('keeps a line break, which a record types on purpose', () => {
    expect(renderBlock('One\nTwo', { breaks: true })).toContain('<br>')
  })

  it('escapes HTML instead of rendering it', () => {
    expect(renderBlock('An <i>italic</i> title.')).toContain('&lt;i&gt;')
    expect(renderBlock('An <i>italic</i> title.')).not.toContain('<i>')
    expect(renderInline('An <i>italic</i> title.')).not.toContain('<i>')
    expect(renderBlock('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('drops markup entirely where the text has to be plain', () => {
    expect(renderPlain('An *italic* title.')).toBe('An italic title.')
    expect(renderPlain('An <i>italic</i> title.')).not.toContain('<i>')
  })
})

describe('renderPlain', () => {
  it('reads a heading, a list and a paragraph as one line', () => {
    expect(renderPlain('# Title\n\n- one\n- two\n\nBody **text**.')).toBe('Title one two Body text.')
  })

  it('turns an image into its alt text and a link into its text', () => {
    expect(renderPlain('See ![a bowl](bowl.jpg) at [the museum](https://example.org).')).toBe(
      'See a bowl at the museum.',
    )
  })

  it('turns a line break into a space', () => {
    expect(renderPlain('One\nTwo')).toBe('One Two')
    expect(renderPlain('One  \nTwo')).toBe('One Two')
  })

  it('decodes an entity the author wrote', () => {
    expect(renderPlain('Salt &amp; pepper &#233;')).toBe('Salt & pepper é')
  })

  it('drops raw tags rather than escaping or rendering them', () => {
    expect(renderPlain('A <b>bold</b> claim')).toBe('A bold claim')
    expect(renderPlain('<script>alert(1)</script>')).not.toContain('<')
  })

  it('reads nothing as nothing', () => {
    expect(renderPlain(null)).toBe('')
    expect(renderPlain('')).toBe('')
  })
})
