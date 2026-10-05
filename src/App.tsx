import { AdminSession } from './components/AdminSession'
import { Questions } from './components/Questions'
import { Section } from './components/Section'
import { outline, outlineTarget, sectionAnchor } from './lib/sections'
import { usePresentation } from './lib/usePresentation'

function App() {
  const { state, retry } = usePresentation()
  const sections = state.status === 'ready' ? state.sections : []

  return (
    <main className="mx-auto max-w-184 px-4 pt-[clamp(3rem,12vh,7rem)] pb-16 sm:px-6">
      <header>
        <h1 className="text-[clamp(2.5rem,7vw,4.25rem)] tracking-[-0.01em]">
          Ryuu Stanley Tistogondo
        </h1>
        <hr className="my-8 h-0.5 w-16 border-0 bg-wash" />
        <p className="max-w-136">
          Who I am, where I stand, and what I plan to do over the next two
          semesters if given the title.
        </p>
      </header>

      <nav aria-label="Sections" className="mt-16">
        <ol className="border-t border-mist">
          {outline.map((item) => {
            const target = outlineTarget(item, sections)
            return (
              <li key={item.label} className="border-b border-mist font-display text-[1.375rem]">
                {target ? (
                  <a href={`#${sectionAnchor(target)}`} className="block py-4 no-underline hover:underline">
                    {item.label}
                  </a>
                ) : (
                  <span className="block py-4">{item.label}</span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {state.status === 'loading' && (
        <p role="status" className="mt-16">
          Loading the presentation…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="mt-16">
          <p>Could not load the presentation: {state.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 cursor-pointer border border-ink px-5 py-2 hover:bg-ink hover:text-paper"
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.sections.length === 0 && (
        <p className="mt-16">Nothing has been published yet.</p>
      )}

      {sections.length > 0 && (
        <div className="mt-20 space-y-20">
          {sections.map((section) => (
            <Section key={section.kind} section={section} />
          ))}
        </div>
      )}

      <div className="mt-20">
        <Questions />
      </div>

      <AdminSession />
    </main>
  )
}

export default App
