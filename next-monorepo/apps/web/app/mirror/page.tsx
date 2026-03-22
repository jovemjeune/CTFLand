import type { Metadata } from "next"

import { MirrorOpsClient } from "@/components/mirror-ops-client"

export const metadata: Metadata = {
  title: "CCIP mirror",
  description:
    "Send RegistryMirror updates over Chainlink CCIP (CCIPRegistryPassport) using your wallet and RPC.",
}

export default function MirrorPage() {
  return <MirrorOpsClient />
}
