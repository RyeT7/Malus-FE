import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'

broadcastResponseToMainFrame().catch((error: unknown) => {
  console.error('Sign-in could not be completed:', error)
})
