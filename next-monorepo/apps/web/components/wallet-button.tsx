"use client"

import * as React from "react"
import { Copy, Loader2, LogOut, QrCode, Wallet } from "lucide-react"
import {
  useConfig,
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from "wagmi"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { filterCtfConnectors } from "@/lib/wallet-filters"

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  React.useEffect(() => {
    if (!enabled) return
    function handle(e: MouseEvent) {
      const el = ref.current
      if (!el || el.contains(e.target as Node)) return
      onOutside()
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [ref, onOutside, enabled])
}

function connectorIcon(id: string) {
  if (id === "walletConnect") {
    return <QrCode className="size-4 shrink-0 opacity-80" aria-hidden />
  }
  return <Wallet className="size-4 shrink-0 opacity-80" aria-hidden />
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function WalletButton() {
  const config = useConfig()
  /** Env default for connect + Registry reads — must be a protocol chain (Arbitrum Sepolia or Fuji). */
  const preferredChainId = React.useMemo(() => {
    const id = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 43113)
    return config.chains.some((c) => c.id === id)
      ? id
      : (config.chains[0]?.id ?? 43113)
  }, [config.chains])

  const supportedIds = React.useMemo(
    () => new Set(config.chains.map((c) => c.id)),
    [config.chains],
  )

  const { address, chainId, isConnected } = useConnection()

  const currentChain = React.useMemo(
    () => config.chains.find((c) => c.id === chainId),
    [config.chains, chainId],
  )
  const {
    connectAsync,
    connectors: connectorsFromHook,
    error,
    isPending,
    reset,
    variables,
  } = useConnect()

  const connectors = React.useMemo(
    () => filterCtfConnectors(connectorsFromHook),
    [connectorsFromHook],
  )
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [accountOpen, setAccountOpen] = React.useState(false)
  const pickerRef = React.useRef<HTMLDivElement>(null)
  const accountRef = React.useRef<HTMLDivElement>(null)

  useClickOutside(pickerRef, () => setPickerOpen(false), pickerOpen)
  useClickOutside(accountRef, () => setAccountOpen(false), accountOpen)

  React.useEffect(() => {
    if (!pickerOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pickerOpen])

  React.useEffect(() => {
    if (!accountOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [accountOpen])

  const pendingConnector =
    variables && "connector" in variables ? variables.connector : undefined
  const pendingUid =
    isPending &&
    pendingConnector &&
    typeof pendingConnector === "object" &&
    "uid" in pendingConnector
      ? (pendingConnector as { uid: string }).uid
      : undefined

  const copyAddress = React.useCallback(() => {
    if (address && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(address)
    }
  }, [address])

  const openPicker = React.useCallback(() => {
    reset()
    setPickerOpen(true)
  }, [reset])

  const runConnect = React.useCallback(
    async (connector: (typeof connectors)[number]) => {
      await connectAsync({
        connector,
        chainId: preferredChainId,
      })
    },
    [connectAsync, preferredChainId],
  )

  const wrongNetwork =
    isConnected &&
    address &&
    chainId !== undefined &&
    !supportedIds.has(chainId)

  if (isConnected && address) {
    return (
      <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-[11rem] sm:items-end">
        {wrongNetwork ? (
          <div className="border-border bg-card/80 w-full rounded-md border px-3 py-2 text-left sm:max-w-xs">
            <p className="text-muted-foreground text-[11px] leading-snug">
              CTFLand only supports{" "}
              <span className="text-foreground font-medium">
                Arbitrum Sepolia
              </span>{" "}
              and{" "}
              <span className="text-foreground font-medium">
                Avalanche Fuji
              </span>
              . MetaMask may list other networks; pick one of these to continue.
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {config.chains.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  className="w-full font-mono text-xs"
                  disabled={isSwitching}
                  onClick={() => switchChain({ chainId: c.id })}
                >
                  {isSwitching ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="text-primary size-4 animate-spin" />
                      Switching…
                    </span>
                  ) : (
                    `Switch to ${c.name}`
                  )}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          ref={accountRef}
          className="relative w-full min-w-0 sm:w-full sm:min-w-[11rem]"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            className={cn(
              "font-mono text-xs",
              "h-11 w-full min-w-0 justify-center px-3 sm:h-9",
              "touch-manipulation",
            )}
            onClick={() => setAccountOpen((o) => !o)}
          >
            <span className="min-w-0 truncate">{shortAddress(address)}</span>
          </Button>
          {accountOpen ? (
            <div
              role="menu"
              className="border-border bg-card/95 absolute right-0 z-50 mt-1.5 w-full min-w-[12rem] overflow-hidden rounded-md border py-1 shadow-lg backdrop-blur-md sm:left-auto sm:min-w-[14rem]"
            >
              <div className="text-muted-foreground border-border border-b px-3 py-2 font-mono text-[10px]">
                {currentChain?.name ?? "Unknown network"} · chain {chainId ?? "—"}
              </div>
              {config.chains.length > 1 ? (
                <div
                  className="border-border border-b px-3 py-2"
                  role="group"
                  aria-label="Protocol networks"
                >
                  <div className="text-muted-foreground mb-1.5 text-[10px] uppercase tracking-wide">
                    Protocol network
                  </div>
                  <div className="flex flex-col gap-1">
                    {config.chains.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitem"
                        disabled={isSwitching || chainId === c.id}
                        className={cn(
                          "hover:bg-muted/80 rounded px-2 py-1.5 text-left text-[11px] disabled:cursor-default disabled:opacity-60",
                          chainId === c.id && "bg-muted/50 text-foreground",
                        )}
                        onClick={() => {
                          void switchChain({ chainId: c.id })
                        }}
                      >
                        {c.name}
                        {chainId === c.id ? " · current" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="hover:bg-muted/80 flex w-full items-center gap-2 px-3 py-3 text-left text-xs sm:py-2"
                onClick={() => {
                  copyAddress()
                  setAccountOpen(false)
                }}
              >
                <Copy className="size-4 shrink-0 opacity-70" />
                Copy address
              </button>
              <button
                type="button"
                role="menuitem"
                className="text-destructive hover:bg-muted/80 flex w-full items-center gap-2 px-3 py-3 text-left text-xs sm:py-2"
                onClick={() => {
                  disconnect()
                  setAccountOpen(false)
                }}
              >
                <LogOut className="size-4 shrink-0 opacity-70" />
                Disconnect
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  /** One connector: connect in a single tap (no menu). */
  if (connectors.length === 1) {
    const only = connectors[0]!
    return (
      <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[9rem]">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          aria-busy={isPending}
          className={cn(
            "font-mono text-xs tracking-wide",
            "h-11 w-full min-w-0 justify-center px-4 sm:h-9",
            "touch-manipulation",
          )}
          onClick={() => {
            void runConnect(only)
          }}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="text-primary size-4 animate-spin" />
              Connecting…
            </span>
          ) : (
            "Connect"
          )}
        </Button>
        {error ? (
          <p className="text-destructive mt-2 max-w-[min(100%,18rem)] text-center text-[11px] leading-snug sm:text-left">
            {error.message}
          </p>
        ) : null}
      </div>
    )
  }

  /** Multiple connectors: tap Connect to open picker (no chevron). */
  return (
    <div
      ref={pickerRef}
      className="relative w-full min-w-0 sm:w-auto sm:min-w-[10.5rem]"
    >
      <Button
        type="button"
        size="sm"
        aria-expanded={pickerOpen}
        aria-haspopup="menu"
        aria-label="Open wallet options"
        disabled={isPending}
        className={cn(
          "font-mono text-xs tracking-wide",
          "h-11 w-full min-w-0 justify-center px-4 sm:h-9",
          "touch-manipulation",
        )}
        onClick={() => {
          if (pickerOpen) {
            setPickerOpen(false)
          } else {
            openPicker()
          }
        }}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="text-primary size-4 animate-spin" />
            Connecting…
          </span>
        ) : (
          "Connect"
        )}
      </Button>

      {pickerOpen ? (
        <div
          role="menu"
          className="border-border bg-card/95 absolute right-0 z-50 mt-1.5 w-full max-h-[min(70vh,320px)] overflow-y-auto rounded-md border py-1 shadow-lg backdrop-blur-md sm:left-auto sm:min-w-[16rem]"
        >
          {connectors.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">
              No connectors configured.
            </p>
          ) : (
            connectors.map((connector) => {
              const loading = isPending && pendingUid === connector.uid
              return (
                <button
                  key={connector.uid}
                  type="button"
                  role="menuitem"
                  disabled={loading}
                  className="hover:bg-muted/80 flex w-full items-center gap-3 px-3 py-3 text-left text-xs disabled:opacity-60 sm:py-2.5"
                  onClick={() => {
                    void runConnect(connector).finally(() =>
                      setPickerOpen(false),
                    )
                  }}
                >
                  {loading ? (
                    <Loader2
                      className="text-primary size-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    connectorIcon(connector.id)
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate font-medium">
                      {connector.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-[10px] leading-tight">
                      {connector.id === "walletConnect"
                        ? "Scan QR with any wallet"
                        : "Browser extension"}
                    </span>
                  </span>
                </button>
              )
            })
          )}
          {error ? (
            <p className="text-destructive border-border border-t px-3 py-2 text-[11px] leading-snug">
              {error.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
