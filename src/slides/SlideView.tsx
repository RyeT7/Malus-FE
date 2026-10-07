import { useEffect, useState } from 'react'
import { listQuestions } from '../lib/api'
import { headline } from '../lib/headline'
import type { Question } from '../types/api'
import { paragraphsOf, type Slide } from './buildSlides'

const refreshMs = 10_000
const topQuestions = 5

function SlideTitle({ title, continued, subtitle }: { title: string; continued?: boolean; subtitle?: string }) {
  return (
    <header>
      <h2 className="text-[clamp(2.75rem,6.5vw,5.5rem)] text-paper">
        {title}
        {continued && <span className="ml-4 align-middle font-sans text-base tracking-wide text-mist uppercase">continued</span>}
      </h2>
      <span aria-hidden="true" className="mt-5 block h-px w-16 bg-wash" />
      {subtitle && <p className="mt-6 text-[clamp(1.4rem,2.6vw,2rem)] text-mist italic font-display">{subtitle}</p>}
    </header>
  )
}

function QuestionsSlide() {
  const [questions, setQuestions] = useState<Question[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = () =>
      listQuestions(controller.signal).then(
        (items) =>
          setQuestions(
            items
              .filter((q) => !q.answered)
              .sort((a, b) => b.votes - a.votes || a.askedAt.localeCompare(b.askedAt))
              .slice(0, topQuestions),
          ),
        () => undefined,
      )
    void load()
    const timer = window.setInterval(() => void load(), refreshMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  return (
    <>
      <SlideTitle title="Questions" />
      <p className="mt-8 text-[clamp(1.25rem,2.2vw,1.75rem)] text-mist">
        Ask and vote at <span className="text-paper">{window.location.host}</span>
      </p>
      {questions && questions.length > 0 && (
        <ol className="mt-10 border-t border-mist/20">
          {questions.map((q) => (
            <li key={q.id} className="flex items-baseline gap-6 border-b border-mist/20 py-4">
              <span className="w-12 shrink-0 text-right font-display text-[clamp(1.5rem,2.4vw,2rem)] text-wash tabular-nums">
                {q.votes}
              </span>
              <span className="text-[clamp(1.2rem,2vw,1.6rem)] text-paper">{q.text}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

export function SlideView({ slide, onJump }: { slide: Slide; onJump: (index: number) => void }) {
  switch (slide.type) {
    case 'title':
      return (
        <div className="text-center">
          <h1 className="text-[clamp(3.5rem,10vw,8.5rem)] text-paper">
            <span className="block">{headline.name[0]}</span>
            <span className="block italic">{headline.name[1]}</span>
          </h1>
          <span aria-hidden="true" className="mx-auto mt-10 block h-px w-24 bg-wash" />
          <p className="mx-auto mt-10 max-w-160 text-[clamp(1.2rem,2.2vw,1.6rem)] text-mist">{headline.tagline}</p>
        </div>
      )
    case 'programme':
      return (
        <>
          <SlideTitle title="Programme" />
          <ol className="mt-10 border-t border-mist/20">
            {slide.entries.map((entry) => (
              <li key={entry.label} className="border-b border-mist/20">
                {entry.slide !== null ? (
                  <button
                    type="button"
                    onClick={() => onJump(entry.slide ?? 0)}
                    className="block w-full cursor-pointer py-4 text-left font-display text-[clamp(1.6rem,3.2vw,2.6rem)] text-paper hover:underline"
                  >
                    {entry.label}
                  </button>
                ) : (
                  <span className="block py-4 font-display text-[clamp(1.6rem,3.2vw,2.6rem)] text-mist">{entry.label}</span>
                )}
              </li>
            ))}
          </ol>
        </>
      )
    case 'text':
      return (
        <>
          <SlideTitle title={slide.title} continued={slide.continued} />
          <div className="mt-10 max-w-200 space-y-5 text-[clamp(1.25rem,2.2vw,1.75rem)] leading-relaxed text-mist">
            {slide.paragraphs.length === 0 && <p>Nothing here yet.</p>}
            {slide.paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </>
      )
    case 'facts':
      return (
        <>
          <SlideTitle title={slide.title} continued={slide.continued} />
          <dl className="mt-10 border-t border-mist/20">
            {slide.items.map((item, i) => (
              <div key={i} className="border-b border-mist/20 py-5 sm:grid sm:grid-cols-[minmax(0,16rem)_1fr] sm:gap-10">
                <dt className="text-base tracking-wide text-mist uppercase">{item.heading}</dt>
                <dd className="mt-1 text-[clamp(1.3rem,2.4vw,2rem)] whitespace-pre-line text-paper sm:mt-0">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </>
      )
    case 'items':
      return (
        <>
          <SlideTitle title={slide.title} continued={slide.continued} subtitle={slide.subtitle} />
          <ol start={slide.items[0]?.number ?? 1} className="mt-10 border-t border-mist/20">
            {slide.items.map((item, i) => (
              <li key={i} value={item.number} className="flex gap-6 border-b border-mist/20 py-5">
                <span aria-hidden="true" className="w-10 shrink-0 font-display text-[clamp(1.4rem,2.4vw,2rem)] text-wash tabular-nums">
                  {item.number}
                </span>
                <div className="min-w-0">
                  <h3 className="font-sans text-[clamp(1.3rem,2.4vw,2rem)] leading-snug font-medium tracking-normal text-paper">
                    {item.heading}
                    {item.part > 0 && <span className="ml-3 text-base font-normal tracking-wide text-mist uppercase">continued</span>}
                  </h3>
                  {item.detail && (
                    <div className="mt-2 space-y-2 text-[clamp(1.05rem,1.7vw,1.35rem)] text-mist">
                      {paragraphsOf(item.detail).map((p, j) => (
                        <p key={j} className="whitespace-pre-line">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )
    case 'questions':
      return <QuestionsSlide />
  }
}
