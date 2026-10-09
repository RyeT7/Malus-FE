import { describe, expect, it } from 'vitest'
import type { PresentationSection, SectionItem, SectionLayout } from '../types/api'
import { buildSlides, maxCharsPerSlide, maxItemsPerSlide } from './buildSlides'

function section(title: string, layout: SectionLayout, items: SectionItem[] = [], body = ''): PresentationSection {
  return { id: title, title, body, layout, items, version: 1, publishedAt: '2026-10-08T00:00:00Z' }
}

function item(heading: string, extra: Partial<SectionItem> = {}): SectionItem {
  return { heading, detail: '', ...extra }
}

describe('buildSlides', () => {
  it('always has a title, a programme and a questions slide', () => {
    const slides = buildSlides([])
    expect(slides.map((s) => s.type)).toEqual(['title', 'programme', 'questions'])
  })

  it('shows facts as one facts slide with numbered items', () => {
    const slides = buildSlides([section('About', 'facts', [item('Name', { detail: 'A' }), item('Major', { detail: 'B' })])])
    const facts = slides.filter((s) => s.type === 'facts')
    expect(facts).toHaveLength(1)
    expect(facts[0].type === 'facts' && facts[0].items.map((i) => [i.number, i.heading])).toEqual([
      [1, 'Name'],
      [2, 'Major'],
    ])
  })

  it('puts a short list intro on the items slide instead of a separate text slide', () => {
    const slides = buildSlides([section('Strengths', 'list', [item('Focus')], 'A short intro.')])
    expect(slides.some((s) => s.type === 'text')).toBe(false)
    const items = slides.find((s) => s.type === 'items')
    expect(items?.type === 'items' && items.subtitle).toBe('A short intro.')
  })

  it('gives a long body its own text slide before the items', () => {
    const body = 'x'.repeat(300)
    const slides = buildSlides([section('Why', 'list', [item('Reason')], body)])
    const own = slides.slice(2, -1)
    expect(own.map((s) => s.type)).toEqual(['text', 'items'])
    expect(own[1].type === 'items' && own[1].continued).toBe(true)
  })

  it('groups a timeline into one slide per semester in order', () => {
    const slides = buildSlides([
      section('Plan', 'timeline', [item('Later', { semester: 2 }), item('First', { semester: 1 }), item('Sometime')]),
    ])
    const labels = slides.slice(2, -1).map((s) => s.label)
    expect(labels).toEqual(['Plan: Unscheduled', 'Plan: Semester 1', 'Plan: Semester 2'])
  })

  it(`splits more than ${maxItemsPerSlide} items across slides`, () => {
    const items = Array.from({ length: maxItemsPerSlide + 1 }, (_, i) => item(`Point ${i + 1}`))
    const own = buildSlides([section('Ideas', 'list', items)]).slice(2, -1)
    expect(own).toHaveLength(2)
    expect(own[1].type === 'items' && own[1].continued).toBe(true)
    expect(own[1].type === 'items' && own[1].items[0].number).toBe(maxItemsPerSlide + 1)
  })

  it('splits a long item detail into parts that keep the item number', () => {
    const paragraph = 'y'.repeat(maxCharsPerSlide - 50)
    const own = buildSlides([section('Deep', 'list', [item('Big', { detail: `${paragraph}\n\n${paragraph}` })])]).slice(2, -1)
    const parts = own.flatMap((s) => (s.type === 'items' ? s.items : []))
    expect(parts.map((p) => [p.number, p.part])).toEqual([
      [1, 0],
      [1, 1],
    ])
  })

  it('shows an empty section as a single empty text slide', () => {
    const own = buildSlides([section('Empty', 'list')]).slice(2, -1)
    expect(own).toEqual([{ type: 'text', title: 'Empty', label: 'Empty', paragraphs: [], continued: false }])
  })

  it('points each programme entry at the first slide of its section', () => {
    const slides = buildSlides([
      section('One', 'list', [item('a')]),
      section('Two', 'facts', [item('b', { detail: 'c' })]),
    ])
    const programme = slides[1]
    expect(programme.type === 'programme' && programme.entries).toEqual([
      { label: 'One', slide: 2 },
      { label: 'Two', slide: 3 },
    ])
    expect(slides[3].label).toBe('Two')
  })
})
