"use client"

import * as React from "react"
import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { useReadContract } from "wagmi"
import { isAddressEqual, zeroAddress, type Address } from "viem"

import { ccipRegistryMirrorReceiverAbi } from "@/lib/ccip-registry-mirror-receiver-abi"
import { ccipRegistryPassportAbi } from "@/lib/ccip-registry-passport-abi"
import { ccipChainSelectorForChainId, ccipPeerChainSelector } from "@/lib/ccip-selectors"
import { getAppChain, getPeerProtocolChain } from "@/lib/chain"
import {
  getCcipRegistryMirrorReceiverAddress,
  getCcipRegistryPassportAddress,
  getRegistryMirrorAddressOnPeerChain,
} from "@/lib/deployed-addresses"
import { registryMirrorAbi } from "@/lib/registry-mirror-abi"

type RowStatus = "ok" | "warn" | "pending"

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "ok") return <CheckCircle2 className="text-primary size-4 shrink-0" aria-hidden />
  if (status === "warn") return <AlertCircle className="text-amber-500 size-4 shrink-0" aria-hidden />
  return <Circle className="text-muted-foreground size-4 shrink-0" aria-hidden />
}

function Row({
  status,
  title,
  detail,
}: {
  status: RowStatus
  title: string
  detail: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <StatusIcon status={status} />
      <div className="min-w-0 space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <div className="text-muted-foreground text-xs leading-relaxed">{detail}</div>
      </div>
    </li>
  )
}

/**
 * On-chain verification of the CCIP mirror checklist (canonical passport + mirror receiver + peer wiring).
 * Uses the app’s canonical chain (`NEXT_PUBLIC_CHAIN_ID`) vs peer from `chain.ts`.
 */
export function CcipEngineeringChecklist() {
  const appChain = getAppChain()
  const peer = getPeerProtocolChain()
  const passport = getCcipRegistryPassportAddress()
  const mirror = getRegistryMirrorAddressOnPeerChain()
  const receiver = getCcipRegistryMirrorReceiverAddress()

  const canonicalSelector = ccipChainSelectorForChainId(appChain.id)
  const expectedDestSelector = ccipPeerChainSelector(appChain.id)

  const { data: destSelector } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "destinationChainSelector",
    chainId: appChain.id,
    query: { enabled: !!passport },
  })

  const { data: destReceiver } = useReadContract({
    address: passport,
    abi: ccipRegistryPassportAbi,
    functionName: "destinationReceiver",
    chainId: appChain.id,
    query: { enabled: !!passport },
  })

  const { data: trustedExecutor } = useReadContract({
    address: mirror,
    abi: registryMirrorAbi,
    functionName: "trustedRemoteExecutor",
    chainId: peer.id,
    query: { enabled: !!mirror },
  })

  const { data: receiverMirror } = useReadContract({
    address: receiver,
    abi: ccipRegistryMirrorReceiverAbi,
    functionName: "registryMirror",
    chainId: peer.id,
    query: { enabled: !!receiver },
  })

  const { data: peerAllowed } = useReadContract({
    address: receiver,
    abi: ccipRegistryMirrorReceiverAbi,
    functionName: "allowedSourceChainSelector",
    args: [canonicalSelector],
    chainId: peer.id,
    query: { enabled: !!receiver },
  })

  const { data: peerSender } = useReadContract({
    address: receiver,
    abi: ccipRegistryMirrorReceiverAbi,
    functionName: "allowedSourceSender",
    args: [canonicalSelector],
    chainId: peer.id,
    query: { enabled: !!receiver },
  })

  const destOk =
    !!passport &&
    destReceiver != null &&
    destReceiver !== zeroAddress &&
    destSelector != null &&
    BigInt(destSelector) === expectedDestSelector

  const executorOk =
    !!mirror &&
    !!receiver &&
    !!trustedExecutor &&
    isAddressEqual(trustedExecutor as Address, receiver as Address)

  const mirrorLinkOk =
    !!mirror &&
    !!receiverMirror &&
    isAddressEqual(receiverMirror as Address, mirror as Address)

  const peerOk =
    !!passport &&
    !!receiver &&
    peerAllowed === true &&
    !!peerSender &&
    peerSender !== zeroAddress &&
    isAddressEqual(peerSender as Address, passport as Address)

  const policyStatus: RowStatus = "ok"
  const passportStatus: RowStatus = passport ? "ok" : "warn"
  const destStatus: RowStatus = !passport ? "pending" : destOk ? "ok" : "warn"
  const mirrorStatus: RowStatus = mirror ? "ok" : "warn"
  const receiverStatus: RowStatus = receiver ? "ok" : "warn"
  const executorStatus: RowStatus =
    !mirror || !receiver ? "pending" : executorOk && mirrorLinkOk ? "ok" : "warn"
  const setPeerStatus: RowStatus =
    !passport || !receiver ? "pending" : peerOk ? "ok" : "warn"

  return (
    <section
      className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-5"
      aria-labelledby="ccip-checklist-heading"
    >
      <div>
        <h2
          id="ccip-checklist-heading"
          className="text-primary font-mono text-sm tracking-wide uppercase"
        >
          CCIP engineering checklist
        </h2>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Canonical (app primary): <strong className="text-foreground">{appChain.name}</strong> — mirror
          peer: <strong className="text-foreground">{peer.name}</strong>. Status uses{" "}
          <code className="font-mono">contract-addresses.json</code> / env overrides and read-only RPC checks
          when addresses exist.
        </p>
      </div>
      <ul className="space-y-4">
        <Row
          status={policyStatus}
          title="Canonical chain for Registry + passport"
          detail={
            <>
              Match product intent with <code className="font-mono">NEXT_PUBLIC_CHAIN_ID</code> (
              {appChain.id}). See <code className="font-mono">foundry/CCIP_DEPLOYMENT.md</code>.
            </>
          }
        />
        <Row
          status={passportStatus}
          title="CCIPRegistryPassport on canonical chain"
          detail={
            passport ? (
              <span className="break-all font-mono">{passport}</span>
            ) : (
              <>Set <code className="font-mono">CCIPRegistryPassport</code> in JSON or env.</>
            )
          }
        />
        <Row
          status={destStatus}
          title="setDestination → mirror chain selector + receiver"
          detail={
            <>
              Expected destination selector:{" "}
              <span className="font-mono">{expectedDestSelector.toString()}</span> ({peer.name}).{" "}
              {destOk ? (
                <span className="text-primary">On-chain config matches.</span>
              ) : passport ? (
                <span>Configure via /mirror or deploy script.</span>
              ) : (
                <span>Deploy passport first.</span>
              )}
            </>
          }
        />
        <Row
          status={mirrorStatus}
          title="RegistryMirror on mirror chain"
          detail={
            mirror ? (
              <span className="break-all font-mono">{mirror}</span>
            ) : (
              <>Deploy mirror stack; set JSON key <code className="font-mono">RegistryMirror</code> on peer.</>
            )
          }
        />
        <Row
          status={receiverStatus}
          title="CCIPRegistryMirrorReceiver on mirror chain"
          detail={
            receiver ? (
              <span className="break-all font-mono">{receiver}</span>
            ) : (
              <>
                Set <code className="font-mono">CCIPRegistryMirrorReceiver</code> in JSON or{" "}
                <code className="font-mono">NEXT_PUBLIC_CCIP_REGISTRY_MIRROR_RECEIVER_ADDRESS</code>.
              </>
            )
          }
        />
        <Row
          status={executorStatus}
          title="Mirror: trustedRemoteExecutor(receiver) + receiver.registryMirror()"
          detail={
            !mirror || !receiver ? (
              <>Needs mirror and receiver addresses.</>
            ) : executorOk && mirrorLinkOk ? (
              <span className="text-primary">Executor and registry link match deployment.</span>
            ) : (
              <>
                Run <code className="font-mono">DeployCCIPMirrorStack</code> wiring or{" "}
                <code className="font-mono">setTrustedRemoteExecutor</code> on the mirror.
              </>
            )
          }
        />
        <Row
          status={setPeerStatus}
          title="receiver.setPeer(canonical selector, passport)"
          detail={
            <>
              Source selector (canonical):{" "}
              <span className="font-mono">{canonicalSelector.toString()}</span>.{" "}
              {peerOk ? (
                <span className="text-primary">Peer allows this passport sender.</span>
              ) : receiver && passport ? (
                <span>Run ConfigureCCIPMirrorReceiverPeer or call setPeer from owner wallet.</span>
              ) : (
                <span>Deploy passport and receiver, then configure peer.</span>
              )}
            </>
          }
        />
      </ul>
      <div className="border-border/60 space-y-2 border-t pt-4">
        <p className="text-foreground font-mono text-[10px] tracking-wide uppercase">Monitoring</p>
        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
          <li>
            Failed CCIP txs / executions —{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="https://ccip.chain.link/"
              target="_blank"
              rel="noreferrer"
            >
              CCIP explorer
            </a>{" "}
            and Chainlink lane docs.
          </li>
          <li>Underfunded sends: ensure <code className="font-mono">msg.value</code> ≥ quote (native fee in this repo).</li>
          <li>
            Out-of-order delivery: passport uses out-of-order execution; if you change that, sequence at the relayer
            layer.
          </li>
        </ul>
      </div>
    </section>
  )
}
