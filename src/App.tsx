const sections = [
  'Biodata',
  'Strengths and weaknesses',
  'Workplan',
  'Innovations',
  'Proposed changes',
  'Why I deserve the title',
]

function App() {
  return (
    <main className="mx-auto max-w-184 px-4 pt-[clamp(3rem,12vh,7rem)] pb-16 sm:px-6">
      <h1 className="text-[clamp(2.5rem,7vw,4.25rem)] tracking-[-0.01em]">
        Ryuu Stanley Tistogondo
      </h1>
      <hr className="my-8 h-0.5 w-16 border-0 bg-wash" />
      <p className="max-w-136">
        Who I am, where I stand, and what I plan to do over the next two
        semesters if given the title.
      </p>
      <nav aria-label="Sections">
        <ol className="mt-16 border-t border-mist">
          {sections.map((section) => (
            <li
              key={section}
              className="border-b border-mist py-4 font-display text-[1.375rem]"
            >
              {section}
            </li>
          ))}
        </ol>
      </nav>
    </main>
  )
}

export default App
