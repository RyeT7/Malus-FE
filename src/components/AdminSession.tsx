import { useState } from 'react'
import { authEnabled, signIn, signOut } from '../lib/auth'
import { useSession } from '../lib/useSession'

const linkButton = 'cursor-pointer underline decoration-mist underline-offset-[0.2em] hover:decoration-2 disabled:cursor-wait'

export function AdminSession() {
  const session = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  let content = null
  if (session.status === 'signed-out') {
    content = authEnabled ? (
      <button type="button" onClick={() => void run(signIn)} disabled={busy} className={linkButton}>
        Admin sign in
      </button>
    ) : (
      <p>Admin sign-in is not configured.</p>
    )
  } else if (session.status === 'signed-in') {
    const { me } = session
    content = (
      <p>
        Signed in as {me.name ?? me.subject}.{' '}
        {me.admin ? (
          <>
            <a href="/admin.html" className="text-paper">
              Edit presentation
            </a>
            .
          </>
        ) : (
          'This account is not an admin for this presentation.'
        )}{' '}
        {authEnabled ? (
          <button type="button" onClick={() => void run(signOut)} disabled={busy} className={linkButton}>
            Sign out
          </button>
        ) : (
          'Sign-in is disabled for local development.'
        )}
      </p>
    )
  } else if (session.status === 'error') {
    content = <p>Could not check sign-in: {session.message}</p>
  }

  return (
    <footer className="mt-28 border-t border-mist/25 pt-8 text-sm text-mist md:pl-[16rem]">
      {content}
      {error && (
        <p role="alert" className="mt-2 font-semibold">
          {error}
        </p>
      )}
    </footer>
  )
}
