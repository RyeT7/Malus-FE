import { describe, expect, it } from 'vitest'
import type { PresentationSection } from '../types/api'
import { sectionAnchors } from './sections'

function section(id: string, title: string): PresentationSection {
  return { id, title, body: '', layout: 'list', items: [], version: 1, publishedAt: '2026-10-08T00:00:00Z' }
}

describe('sectionAnchors', () => {
  it('turns titles into readable anchors', () => {
    const anchors = sectionAnchors([section('a', 'Why I deserve the title'), section('b', 'Café Résumé!')])
    expect(anchors.get('a')).toBe('why-i-deserve-the-title')
    expect(anchors.get('b')).toBe('cafe-resume')
  })

  it('numbers duplicate titles', () => {
    const anchors = sectionAnchors([section('a', 'Plan'), section('b', 'Plan'), section('c', 'plan')])
    expect([anchors.get('a'), anchors.get('b'), anchors.get('c')]).toEqual(['plan', 'plan-2', 'plan-3'])
  })

  it('avoids ids already used on the page', () => {
    const anchors = sectionAnchors([section('a', 'Questions'), section('b', 'Programme')])
    expect(anchors.get('a')).toBe('questions-2')
    expect(anchors.get('b')).toBe('programme-2')
  })

  it('falls back to "section" when a title has no letters or digits', () => {
    const anchors = sectionAnchors([section('a', '!!!'), section('b', '???')])
    expect([anchors.get('a'), anchors.get('b')]).toEqual(['section', 'section-2'])
  })
})
