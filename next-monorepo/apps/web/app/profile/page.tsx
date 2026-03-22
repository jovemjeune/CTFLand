import type { Metadata } from "next"

import { CompetitorProfileClient } from "@/components/competitor-profile-client"

export const metadata: Metadata = {
  title: "Competitor profile",
  description:
    "World ID verification and Competitor NFT — sybil-resistant competitor credential.",
}

export default function ProfilePage() {
  return <CompetitorProfileClient />
}
