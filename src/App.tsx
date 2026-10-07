import { AdminSession } from './components/AdminSession'
import { Programme } from './components/Programme'
import { Questions } from './components/Questions'
import { Scene } from './components/Scene'
import { Section } from './components/Section'
import { Stage } from './components/Stage'
import { StageLights } from './components/StageLights'
import { usePresentation } from './lib/usePresentation'

function App() {
  const { state, retry } = usePresentation()
  const sections = state.status === 'ready' ? state.sections : []

  return (
    <>
      <StageLights />

      <div className="relative z-10">
        <Stage />

        <main>
          <Scene>
            <Programme sections={sections} />

            {state.status === 'loading' && (
              <p role="status" className="mt-12 text-mist md:pl-[16rem]">
                Loading the presentation…
              </p>
            )}

            {state.status === 'error' && (
              <div role="alert" className="mt-12 md:pl-[16rem]">
                <p>Could not load the presentation: {state.message}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 cursor-pointer bg-paper px-6 py-3 text-ink transition-colors duration-300 hover:bg-mist"
                >
                  Try again
                </button>
              </div>
            )}

            {state.status === 'ready' && state.sections.length === 0 && (
              <p className="mt-12 text-mist md:pl-[16rem]">Nothing has been published yet.</p>
            )}
          </Scene>

          {sections.map((section) => (
            <Section key={section.kind} section={section} />
          ))}
        </main>

        <div className="snap-start border-t border-mist/15">
          <div className="mx-auto max-w-5xl px-5 pt-28 pb-14 sm:px-8 md:pt-36">
            <Questions />
            <AdminSession />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
