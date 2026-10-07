import type { CSSProperties } from 'react'

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties

export function Stage() {
  return (
    <header className="relative isolate flex min-h-svh snap-start snap-always flex-col overflow-hidden">
      <div aria-hidden="true" className="spotlight absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-wash" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-[clamp(3.25rem,11vw,9rem)] text-paper">
          <span className="rise block" style={delay(1250)}>
            Ryuu Stanley
          </span>
          <span className="rise block italic" style={delay(1400)}>
            Tistogondo
          </span>
        </h1>
        <span aria-hidden="true" className="rule-grow mt-10 block h-px w-24 bg-wash" style={delay(1650)} />
        <p className="rise mt-10 max-w-110 text-lg text-mist" style={delay(1800)}>
          Who I am, where I stand, and what I plan to do over the next two
          semesters if given the title.
        </p>
      </div>

      <div aria-hidden="true" className="absolute bottom-8 left-1/2 h-14 w-px -translate-x-1/2 overflow-hidden">
        <span className="scroll-cue block h-full w-full bg-mist" />
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex">
        <span className="curtain-left block h-full w-1/2 bg-wash" />
        <span className="curtain-right block h-full w-1/2 bg-wash" />
      </div>
    </header>
  )
}
