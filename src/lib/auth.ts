import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID ?? ''
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID ?? ''
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE ?? ''

export const authEnabled = clientId !== '' && tenantId !== '' && apiScope !== ''

let started: Promise<PublicClientApplication> | undefined

function client(): Promise<PublicClientApplication> {
  started ??= start()
  return started
}

async function start(): Promise<PublicClientApplication> {
  const bridge = `${window.location.origin}/redirect.html`
  const app = new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: bridge,
      postLogoutRedirectUri: bridge,
    },
    cache: { cacheLocation: 'sessionStorage' },
  })
  await app.initialize()
  const result = await app.handleRedirectPromise()
  app.setActiveAccount(result?.account ?? app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null)
  return app
}

export async function getAccount(): Promise<AccountInfo | null> {
  if (!authEnabled) {
    return null
  }
  return (await client()).getActiveAccount()
}

export async function signIn(): Promise<void> {
  await (await client()).loginRedirect({ scopes: [apiScope] })
}

export async function signOut(): Promise<void> {
  const app = await client()
  await app.logoutRedirect({ account: app.getActiveAccount() })
}

export async function getAccessToken(): Promise<string | undefined> {
  if (!authEnabled) {
    return undefined
  }
  const app = await client()
  const account = app.getActiveAccount()
  if (!account) {
    return undefined
  }
  try {
    const result = await app.acquireTokenSilent({ scopes: [apiScope], account })
    return result.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await app.acquireTokenRedirect({ scopes: [apiScope], account })
    }
    throw err
  }
}
