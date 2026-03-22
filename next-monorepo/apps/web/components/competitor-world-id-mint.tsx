"use client"

import * as React from "react"
import { IDKitWidget } from "@worldcoin/idkit"
import type { ISuccessResult } from "@worldcoin/idkit"
import { AlertCircle, BadgeCheck, Loader2 } from "lucide-react"
import {
  useChainId,
  useConnection,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { Button } from "@workspace/ui/components/button"

import { competitorNftAbi } from "@/lib/competitor-abi"
import { getAppChain } from "@/lib/chain"
import { getCompetitorNftAddressForApp } from "@/lib/deployed-addresses"
import { parseWorldIdSuccess } from "@/lib/world-proof"
import { getWorldIdKitPublicConfig } from "@/lib/world-env"

type CompetitorWorldIdMintProps = {
  /** When true, mint button is hidden (e.g. parent already shows success). */
  hideWhenHasNft?: boolean
  /** Called after the mint tx is confirmed (e.g. parent refetches balance). */
  onMintConfirmed?: () => void
}

/**
 * Shared World ID → `claimWithWorldId` flow (IDKit + wagmi).
 * Used on /profile and /competitors identity gate.
 */
export function CompetitorWorldIdMint({
  hideWhenHasNft = false,
  onMintConfirmed,
}: CompetitorWorldIdMintProps) {
  const { appId, action, actionDescription, verificationLevel, appIdStatus } =
    getWorldIdKitPublicConfig()
  const nft = getCompetitorNftAddressForApp()
  const chain = getAppChain()

  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const { writeContract, data: txHash, error: writeError, isPending: isWriting, reset } =
    useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash })

  const wrongChain = isConnected && chainId !== chain.id

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: nft,
    abi: competitorNftAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!nft },
  })

  const [localError, setLocalError] = React.useState<string | null>(null)

  const onWorldSuccess = React.useCallback(
    async (result: ISuccessResult) => {
      setLocalError(null)
      if (!address || !nft) {
        setLocalError("Connect wallet and set COMPETITOR_NFT_ADDRESS.")
        return
      }
      try {
        const { root, nullifierHash, proof } = parseWorldIdSuccess(result)
        writeContract({
          address: nft,
          abi: competitorNftAbi,
          functionName: "claimWithWorldId",
          args: [address, root, nullifierHash, [...proof]],
          chainId: chain.id,
        })
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : String(e))
      }
    },
    [address, nft, writeContract, chain.id],
  )

  React.useEffect(() => {
    if (isConfirmed) {
      void refetchBalance()
      reset()
      onMintConfirmed?.()
    }
  }, [isConfirmed, refetchBalance, reset, onMintConfirmed])

  const hasNft = balance !== undefined && balance > 0n

  if (!nft) {
    return (
      <p className="text-muted-foreground text-sm">
        Set <code className="font-mono text-xs">NEXT_PUBLIC_COMPETITOR_NFT_ADDRESS</code> in{" "}
        <code className="font-mono text-xs">apps/web/.env.local</code>, or add{" "}
        <code className="font-mono text-xs">CompetitorNFT</code> for your chain in{" "}
        <code className="font-mono text-xs">lib/contract-addresses.json</code>.
      </p>
    )
  }

  if (!isConnected || !address) {
    return (
      <p className="text-muted-foreground text-sm">
        Connect your wallet in the header to verify and mint.
      </p>
    )
  }

  if (wrongChain) {
    return (
      <Button
        type="button"
        size="sm"
        className="font-mono text-xs"
        disabled={isSwitching}
        onClick={() => switchChain({ chainId: chain.id })}
      >
        {isSwitching ? "Switching…" : `Switch to ${chain.name}`}
      </Button>
    )
  }

  if (hasNft && hideWhenHasNft) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {!appId ? (
        <div className="text-muted-foreground flex gap-2 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            {appIdStatus.state === "invalid" ? (
              <>
                <code className="font-mono text-xs">NEXT_PUBLIC_WORLD_APP_ID</code> must
                start with <code className="font-mono text-xs">app_</code>. Restart{" "}
                <code className="font-mono text-[11px]">npm run dev</code> after editing
                .env.
              </>
            ) : (
              <>
                Set <code className="font-mono text-xs">NEXT_PUBLIC_WORLD_APP_ID</code> in{" "}
                <code className="font-mono text-xs">apps/web/.env.local</code> and restart
                the dev server.
              </>
            )}
          </span>
        </div>
      ) : null}

      {appId ? (
        <IDKitWidget
          app_id={appId}
          action={action}
          {...(actionDescription ? { action_description: actionDescription } : {})}
          signal={address}
          verification_level={verificationLevel}
          onSuccess={onWorldSuccess}
        >
          {({ open }: { open: () => void }) => (
            <Button
              type="button"
              className="font-mono text-xs tracking-wide"
              disabled={hasNft || isWriting || isConfirming}
              onClick={() => {
                setLocalError(null)
                open()
              }}
            >
              {hasNft ? (
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck className="size-4" />
                  Already verified &amp; minted
                </span>
              ) : isWriting || isConfirming ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {isConfirming ? "Confirming…" : "Submitting tx…"}
                </span>
              ) : (
                "Verify with World ID & mint"
              )}
            </Button>
          )}
        </IDKitWidget>
      ) : null}

      {localError ? (
        <p className="text-destructive text-sm">{localError}</p>
      ) : null}
      {writeError ? (
        <p className="text-destructive text-sm">{writeError.message}</p>
      ) : null}
    </div>
  )
}
