import type { Metadata } from "next"

import { CredentialApply } from "@/components/credential-apply"

export const metadata: Metadata = {
  title: "Apply — Triage",
  description:
    "Verify triage credentials: platform history, High findings, USD 10k+, Twitter/X, then OTP and Triage NFT mint.",
}

export default function TriageApplyPage() {
  return (
    <CredentialApply
      role="triage"
      title="Apply for triage"
      barSummary="If you already hold a Triage NFT on this network, you are done. Otherwise declare your Immunefi, Sherlock, Code4rena, Cantina, or CodeHawks profile evidence: at least one High (or stronger) severity finding, at least USD 10,000 in documented payouts, and a public Twitter / X link. You will sign a message, receive a one-time code, then the verifier wallet mints your soulbound Triage NFT."
    />
  )
}
