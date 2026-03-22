import type { Metadata } from "next"

import { CredentialApply } from "@/components/credential-apply"

export const metadata: Metadata = {
  title: "Apply — Judge",
  description:
    "Verify judge credentials: platform profile, at least one valid bug, Twitter/X, then OTP and Judge NFT mint.",
}

export default function JudgeApplyPage() {
  return (
    <CredentialApply
      role="judge"
      title="Apply as judge"
      barSummary="If you already hold a Judge NFT on this network, you are done. Otherwise show your Immunefi, Sherlock, Code4rena, Cantina, or CodeHawks profile with at least one valid bug and a public Twitter / X link. You will sign a message, receive a one-time code, then the verifier wallet mints your soulbound Judge NFT."
    />
  )
}
