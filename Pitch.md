# CTFLand — Pitch notes

> **Elevator line:** CTFLand ties serious competitions to serious rules: World ID for real humans, collateral so sponsors can’t vanish, and judges who actually had to earn the chair. Payouts follow the contract, not a DM.

You get maybe **three minutes** before eyes glaze over. Below is a rough arc you can steal, but **rewrite the lines in your own words**—judges hear the same “problem → solution → traction → market” cadence all day.

Slideshow tip: one thought per slide. Say the rest out loud.

---

## Rough arc (~5 min)

### Open (~20s)

Start with something concrete, not a definition.

Examples (don’t read them like a script—pick the vibe and paraphrase):

- “Ever watch a contest where the sponsor just… stops answering?”
- “We kept seeing the same thing: great work, messy finish.”
- “Skill isn’t the hard part. **Finality** is.”

Then one sentence on the pain: fake accounts, soft judges, money that never moves—or moves to the wrong people.

---

### What we’re building (~40s)

CTFLand is a **protocol + frontend** for 48-hour style challenges: audits, bounties, old-school CTFs, hiring sprints, hackathons. The point isn’t “another leaderboard.” It’s **who can enter**, **who can judge**, and **how money leaves the pool**.

If you only remember four things to say:

1. **[World ID](https://world.org/world-id)** + **Competitor NFT** — you’re not farming the board with fifty wallets.  
2. **Judges / triage aren’t vanity titles** — we gate them with receipts from real platforms (details in the appendix).  
3. **Sponsors post reward + collateral** — walking away has a cost.  
4. **Chainlink CCIP (our build)** — mirror CTF state to a second testnet so people can **see** the same story on Fuji and Arbitrum Sepolia without pretending AVAX and ETH are the same pot. Stake stays native; **visibility** crosses.

Your line, not mine: say why *you* cared enough to build this.

---

### What we actually shipped (hackathon) (~40s)

Skip fake metrics. Say what runs:

- Contracts in `foundry/` — Registry, NFTs, treasury wiring, plus the CCIP passport + mirror path if you deployed it.  
- App in `next-monorepo` — wallet, flows, `/mirror` when addresses are in env.  

Be blunt: we did **not** ship a full indexer, a Postgres back office, or Mailchimp for sponsors. That’s fine. Say it. Judges respect scope honesty.

---

### Who cares / why now (~25s)

Auditors, bounty hunters, CTF people, hackathon teams, any sponsor who needs an outcome they can **defend** to their own org.

Why now isn’t deep philosophy—wallets don’t suck like 2017, identity primitives exist, and CCIP is boring in a good way: it moves messages you can point to on an explorer.

---

### Stack (~25s)

Keep it short. Example shape:

- Solidity / Foundry for rules you can read.  
- World ID because “one person” still matters.  
- CCIP because our story is **multi-chain visibility**, not bridging bags of money.  
- Next.js + wagmi because we need a demo people can actually run (`OverallSummary.md`).

If they ask “why not X,” have a one-sentence opinion, not a whitepaper.

---

### Team (~15s)

Fill this in yourself—names, what you’ve done before, why **this** problem. Generic “we’re passionate” is noise.

---

### Demo (~90s)

One path. Rehearse it until it’s boring for **you**.

Order that usually works: start the app (scripts in repo root), show the wallet on the right chain, do **one** thing that proves your thesis—mint, resolve, treasury, whatever is stable—then if CCIP is live, hit `/mirror` or send one mirror update and show [CCIP explorer](https://ccip.chain.link/) or a tx.

If the RPC gods hate you that day, **record the demo the night before** and play the clip. Nobody gets a medal for live courage when the Wi‑Fi dies.

**Recording:** OBS is fine. Loom is fine. QuickTime / Win+G is fine. 1080p, show the network name in the wallet when you talk about CCIP.

---

### Land the plane (~15s)

End with what you want: try the repo, argue with us about incentives, intro to a sponsor, whatever the event is for.

Optional closer (paraphrase, don’t quote): *same humans, same rules, second chain catches up in the mirror.*

---

## Stuff that helps (not a checklist from McKinsey)

- Time yourself. Cut until it hurts.  
- One plain sentence before any acronym.  
- Slides: big type, almost no text.  
- Have answers for: why World ID, why CCIP, what’s on-chain vs not, what you’d build next with money.  
- Sound like you **built** it, not like you summarized a blog post.

---

## Don’t

- List twelve features.  
- Hide behind jargon.  
- Demo on hotel Wi‑Fi without a backup video.  
- Forget to say what you want from the room.

---

# Appendix — product depth (for Q&A and long-form readers)

## Why CTFLand exists

Bug-bounty and contest platforms proved **incentives matter**. CTFLand extends that across **security audits, bounties, classical CTFs, hiring competitions, and hackathons**—with **sponsors who can’t walk away on a whim** and **payouts encoded in rules**, not goodwill.

We raise the bar on **who can judge and who can triage**, so competitors aren’t graded by tourists—only by people with **proven skin in the game** where it counts.

---

## Who can play (sybil resistance)

To **compete and submit**:

1. **Verify with [World ID](https://world.org/world-id)** — unique personhood; harder to farm the leaderboard.  
2. **Hold a Competitor NFT** — on-chain credential tied to verification.

This is **sybil resistance with receipts**, not surveillance theater.

---

## The five modes of play (summary)

| Mode | Essence |
|------|--------|
| **CTF — Security Audit** | Smart-contract / protocol security; judges, triage, sponsor roles defined. |
| **CTF — Security Bounty** | Web2 + Web3 surfaces; same accountability story. |
| **CTF — General** | Classical CTF; winning condition may be private to protocol; first correct solve / judgement can be rewarded. |
| **CTF — Job** | Company-run; sponsor judges; platform judges/triage excluded unless security triage is explicitly activated. |
| **CTF — Hackathon** | Builder track; optional triage for security tooling; sponsors can judge if no volunteers. |

---

## The 48-hour rhythm

**48 hours** from the challenge clock to complete and submit—forcing **prioritization and momentum** like real incident and contest finals.

---

## Judges & triage: proof of credibility

| Role | Bar to apply |
|------|----------------|
| **Judge** | At least **one High-severity (or stronger)** finding on **Immunefi**, **Sherlock**, **CodeHawks**, **Code4rena**, or **Cantina**. |
| **Triage** | At least **USD 10,000** in documented payouts / earnings across those ecosystems. |

If you haven’t earned your stripes, your application **doesn’t clear**.

---

## Economics: rewards, collateral, fair exit (high level)

### Sponsor commitment

- Sponsors **cannot cancel a live challenge on a whim**.  
- They post **advertised reward + 10% collateral** up front.  
- If a sponsor is **unresponsive**, collateral **does not return to them** as a free pass—it is **distributed to participants** per protocol rules.

### Payout philosophy (triage on, sponsor responsive)

- **85%** competitors · **10%** judges · **4%** triage · **1%** protocol treasury.

### No triage, judges present

- **85%** competitors · **14%** judges · **1%** treasury.

### Unresponsive judges / collateral

- The **10% collateral layer** can be **forfeited** and shared with participants—**staking money means staking attention**.

**On-chain note:** After resolution, `Registry.distributeRewards` implements the **85/14/1** and **85/10/4/1** splits where applicable. Some **unresponsive-sponsor** liquidity paths are **policy** for future full trustless encoding—see contracts and governance.

---

## Multi-chain: Arbitrum & Avalanche

**Cross-chain messaging** mirrors **CTF lifecycle and outcome state** **asynchronously**; **native collateral** stays per chain unless you add an explicit asset bridge.

**Shipped CCIP path (demo):** Canonical testnet (**Fuji**) **`CCIPRegistryPassport`** → **`ccipSend`**; peer (**Arbitrum Sepolia**) **`CCIPRegistryMirrorReceiver`** → **`RegistryMirror`**. Scripts: `foundry/script/deploy/finalize_ccip_testnet.sh`. Docs: [`foundry/CROSS_CHAIN.md`](foundry/CROSS_CHAIN.md), [`foundry/CCIP_DEPLOYMENT.md`](foundry/CCIP_DEPLOYMENT.md). App: **`/mirror`** checklist and ops when addresses are set.

---

## Hackathon scope vs full product

**Hackathon-credible:** Contracts + wallet UX + integrations (World ID, CCIP) + **one** live path.  
**Post-hackathon:** Full indexer, Postgres, notification systems, multi-tenant admin, hardened ops.

**Enough for a killer demo:** One **memorable** story (fair play + proof) + **one** working vertical slice on screen.

---

## Brand close

CTFLand isn’t another leaderboard with a Discord bot. It’s a **credentialed, collateralized competition layer**—where **humans are verified**, **judges are proven**, **sponsors are bound**, and **the best submission wins**.

*CTFLand — **Verify. Compete. Get Paid.***
