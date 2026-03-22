"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  useChainId,
  useConnection,
  useReadContract,
  useSignMessage,
  useSwitchChain,
} from "wagmi"

import { Button } from "@workspace/ui/components/button"

import type { CredentialRole } from "@/lib/credential-message"
import type { CredentialProfilePayload } from "@/lib/credential-validation"
import { getAppChain } from "@/lib/chain"
import {
  getJudgeNftAddressForApp,
  getTriageNftAddressForApp,
} from "@/lib/deployed-addresses"
import { explorerTxUrl } from "@/lib/explorer-tx"
import { judgeNftAbi, triageNftAbi } from "@/lib/triage-judge-abi"

const inputClass =
  "border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"

type Props = {
  role: CredentialRole
  title: string
  barSummary: string
}

function parseUrls(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function CredentialApply({ role, title, barSummary }: Props) {
  const chain = getAppChain()
  const { address, isConnected } = useConnection()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { signMessageAsync, isPending: isSigning } = useSignMessage()

  const triageAddr = getTriageNftAddressForApp()
  const judgeAddr = getJudgeNftAddressForApp()
  const nftAddr = role === "triage" ? triageAddr : judgeAddr

  const wrongChain = isConnected && chainId !== chain.id

  const { data: isMember, refetch: refetchMember } = useReadContract({
    address: nftAddr,
    abi: role === "triage" ? triageNftAbi : judgeNftAbi,
    functionName: role === "triage" ? "isTriageMember" : "isJudgeMember",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!nftAddr && !wrongChain,
    },
  })

  const [platformUrlsText, setPlatformUrlsText] = React.useState("")
  const [twitterUrl, setTwitterUrl] = React.useState("")
  const [highCount, setHighCount] = React.useState("")
  const [auditUsd, setAuditUsd] = React.useState("")
  const [validBugs, setValidBugs] = React.useState("")

  const [step, setStep] = React.useState<"form" | "otp" | "done">("form")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [demoOtp, setDemoOtp] = React.useState<string | null>(null)
  const [txHash, setTxHash] = React.useState<string | null>(null)
  const [otpInput, setOtpInput] = React.useState("")

  const alreadyVerified = Boolean(isMember)

  async function runVerify() {
    if (!address) return
    setError(null)
    setBusy(true)
    try {
      const platformUrls = parseUrls(platformUrlsText)
      const profile: CredentialProfilePayload =
        role === "triage"
          ? {
              platformUrls,
              twitterUrl: twitterUrl.trim(),
              highSeverityCount: Number(highCount),
              auditUsdTotal: Number(auditUsd),
            }
          : {
              platformUrls,
              twitterUrl: twitterUrl.trim(),
              validBugCount: Number(validBugs),
            }

      const ch = await fetch("/api/credentials/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, address }),
      })
      const chJson = (await ch.json()) as {
        error?: string
        message?: string
        nonce?: string
      }
      if (!ch.ok) {
        throw new Error(chJson.error ?? "Challenge failed.")
      }
      if (!chJson.message || !chJson.nonce) {
        throw new Error("Invalid challenge response.")
      }

      const signature = await signMessageAsync({ message: chJson.message })

      const st = await fetch("/api/credentials/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          nonce: chJson.nonce,
          signature,
          profile,
        }),
      })
      const stJson = (await st.json()) as {
        error?: string
        ok?: boolean
        alreadyVerified?: boolean
        demoOtp?: string
      }
      if (!st.ok) {
        throw new Error(stJson.error ?? "Verification rejected.")
      }
      if (stJson.alreadyVerified) {
        void refetchMember()
        setStep("done")
        return
      }
      if (stJson.demoOtp) setDemoOtp(stJson.demoOtp)
      setStep("otp")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function runConfirm() {
    if (!address) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch("/api/credentials/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          address,
          otp: otpInput.trim(),
        }),
      })
      const j = (await res.json()) as {
        error?: string
        ok?: boolean
        txHash?: string
        alreadyVerified?: boolean
      }
      if (!res.ok) {
        throw new Error(j.error ?? "Confirmation failed.")
      }
      if (j.txHash) setTxHash(j.txHash)
      void refetchMember()
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirmation failed.")
    } finally {
      setBusy(false)
    }
  }

  const explorer = txHash ? explorerTxUrl(chain.id, txHash) : undefined

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="font-mono text-2xl tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {barSummary}
        </p>
      </header>

      <div className="border-amber-500/30 bg-amber-500/5 space-y-2 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">
          Before you start: Twitter / X is required
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Verification needs a public <strong className="text-foreground">Twitter or X profile link</strong>{" "}
          on your Immunefi, Sherlock, Code4rena, Cantina, or CodeHawks profile. Without it, the server
          rejects the application. Sending a one-time code to your X handle requires{" "}
          <strong className="text-foreground">X API access</strong>; in this build we generate the OTP
          server-side — use demo mode to reveal it, or coordinate the code out-of-band (e.g. DM yourself
          from ops).
        </p>
      </div>

      {!nftAddr ? (
        <p className="text-destructive text-sm">
          NFT contract address is not configured for this app chain. Set{" "}
          <code className="font-mono text-xs">
            {role === "triage"
              ? "NEXT_PUBLIC_TRIAGE_NFT_ADDRESS"
              : "NEXT_PUBLIC_JUDGE_NFT_ADDRESS"}
          </code>{" "}
          or update <code className="font-mono text-xs">contract-addresses.json</code>.
        </p>
      ) : null}

      {!isConnected || !address ? (
        <p className="text-muted-foreground text-sm">
          Connect your wallet in the header to continue.
        </p>
      ) : wrongChain ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Switch to the app primary network ({chain.name}) so your credential NFT mints on the same
            chain as the verifier.
          </p>
          <Button
            type="button"
            size="sm"
            className="font-mono text-xs"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: chain.id })}
          >
            {isSwitching ? "Switching…" : `Switch to ${chain.name}`}
          </Button>
        </div>
      ) : alreadyVerified ? (
        <div className="border-border/80 bg-card/30 space-y-3 rounded-lg border p-6">
          <p className="text-foreground text-sm">
            You already hold a {role === "triage" ? "Triage" : "Judge"} credential NFT on this network.
          </p>
          <Button asChild variant="outline" size="sm" className="font-mono text-xs">
            <Link href="/judges">← Judges &amp; triage</Link>
          </Button>
        </div>
      ) : step === "done" ? (
        <div className="border-border/80 bg-card/30 space-y-3 rounded-lg border p-6">
          <p className="text-foreground text-sm">
            {txHash
              ? "Credential mint submitted."
              : "You are verified (existing NFT) or the flow completed."}
          </p>
          {txHash && explorer ? (
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="text-primary font-mono text-xs underline-offset-4 hover:underline"
            >
              View transaction
            </a>
          ) : null}
          <Button asChild variant="outline" size="sm" className="font-mono text-xs">
            <Link href="/judges">← Judges &amp; triage</Link>
          </Button>
        </div>
      ) : step === "otp" ? (
        <section className="border-border/80 bg-card/30 space-y-4 rounded-lg border p-6">
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            Enter OTP
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Check your X/Twitter DMs if integrated; otherwise use the demo code when{" "}
            <code className="font-mono text-xs">CREDENTIALS_DEMO_REVEAL_OTP</code> is enabled on the server.
          </p>
          {demoOtp ? (
            <p className="text-foreground bg-muted/40 rounded-md border border-border/80 px-3 py-2 font-mono text-sm">
              Demo OTP: <span className="text-primary">{demoOtp}</span>
            </p>
          ) : null}
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
          />
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="font-mono text-xs"
            disabled={busy || otpInput.trim().length < 6}
            onClick={() => void runConfirm()}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Confirming…
              </span>
            ) : (
              "Confirm & mint"
            )}
          </Button>
        </section>
      ) : (
        <section className="border-border/80 bg-card/30 space-y-5 rounded-lg border p-6">
          <h2 className="text-primary font-mono text-sm tracking-wide uppercase">
            Platform evidence
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Paste public profile URLs (one per line) on{" "}
            <strong className="text-foreground">Immunefi, Sherlock, Code4rena, Cantina, or CodeHawks</strong>.
            Include your <strong className="text-foreground">Twitter / X link</strong> in the field below
            (must match what appears on those profiles).
          </p>

          <label className="block space-y-1.5">
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
              Platform URLs
            </span>
            <textarea
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder={"https://immunefi.com/bounty/…\nhttps://code4rena.com/…"}
              value={platformUrlsText}
              onChange={(e) => setPlatformUrlsText(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
              Twitter / X profile URL
            </span>
            <input
              type="url"
              className={inputClass}
              placeholder="https://x.com/yourhandle"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
            />
          </label>

          {role === "triage" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
                  High (or stronger) findings (count)
                </span>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={highCount}
                  onChange={(e) => setHighCount(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
                  Documented audit / bounty USD total
                </span>
                <input
                  type="number"
                  min={10000}
                  step="1"
                  className={inputClass}
                  value={auditUsd}
                  onChange={(e) => setAuditUsd(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
                Valid bugs on supported platforms (count)
              </span>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={validBugs}
                onChange={(e) => setValidBugs(e.target.value)}
              />
            </label>
          )}

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <Button
            type="button"
            size="sm"
            className="font-mono text-xs"
            disabled={
              busy ||
              isSigning ||
              !nftAddr ||
              !platformUrlsText.trim() ||
              !twitterUrl.trim()
            }
            onClick={() => void runVerify()}
          >
            {busy || isSigning ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Sign &amp; verify…
              </span>
            ) : (
              "Sign message & request OTP"
            )}
          </Button>
        </section>
      )}
    </div>
  )
}
