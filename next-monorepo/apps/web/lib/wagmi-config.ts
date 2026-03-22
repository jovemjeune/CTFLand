import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
  injected,
} from "wagmi"
import { walletConnect } from "wagmi/connectors"

import { getAppChains, getDefaultRpcUrl } from "@/lib/chain"

const chains = getAppChains()

const transports = {
  [chains[0].id]: http(getDefaultRpcUrl(chains[0])),
  [chains[1].id]: http(getDefaultRpcUrl(chains[1])),
} as const

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: "CTFLand",
            description:
              "World ID–verified, collateral-backed competition network.",
            url: appUrl,
            icons: [`${appUrl.replace(/\/$/, "")}/favicon.ico`],
          },
        }),
      ]
    : []),
]

/** Cookie storage + `initialState` from the server layout lets Next.js SSR match client wallet state (wagmi SSR guide). */
export const wagmiConfig = createConfig({
  chains: [...chains],
  transports,
  connectors,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
})
