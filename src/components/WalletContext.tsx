"use client";
import { getAddress, isConnected, isAllowed } from "@stellar/freighter-api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useToast } from "./ToastProvider";

/**
 * Wallet state is split from wallet actions (#648).
 *
 * Previously one context held both, so every `isLoading` flip re-rendered each
 * consumer — including components that only ever call `connectWallet` and never
 * read state. Splitting means:
 *
 *   - `useWalletState()`   re-renders when publicKey / connected / loading change
 *   - `useWalletActions()` never re-renders: the value is created once
 *
 * Both values are memoized, so a re-render of `WalletProvider` itself does not
 * cascade into consumers unless the data they read actually changed.
 */

interface WalletState {
  publicKey: string | null;
  isWalletConnected: boolean;
  isLoading: boolean;
}

interface WalletActions {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletStateContext = createContext<WalletState | undefined>(undefined);
const WalletActionsContext = createContext<WalletActions | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showWarning, showSuccess } = useToast();

  const checkWalletConnection = useCallback(async () => {
    try {
      const connected = await isConnected();
      const allowed = await isAllowed();
      if (connected && allowed) {
        const key = await getAddress();
        setPublicKey(key.address);
        setIsWalletConnected(true);
        localStorage.setItem("stellar_wallet_public_key", key.address);
      } else {
        localStorage.removeItem("stellar_wallet_public_key");
      }
    } catch {
      localStorage.removeItem("stellar_wallet_public_key");
    }
  }, []);

  useEffect(() => {
    // Always re-verify with Freighter rather than blindly trusting localStorage (#97)
    checkWalletConnection();
  }, [checkWalletConnection]);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const connected = await isConnected();
      if (!connected) {
        showWarning("Freighter wallet not found. Opening install page…");
        window.open("https://www.freighter.app/", "_blank");
        setIsLoading(false);
        return;
      }
      const allowed = await isAllowed();
      if (!allowed) {
        showWarning("Please allow Freighter to connect to this site.");
        setIsLoading(false);
        return;
      }
      const key = await getAddress();
      setPublicKey(key.address);
      setIsWalletConnected(true);
      localStorage.setItem("stellar_wallet_public_key", key.address);
      showSuccess("Wallet connected successfully.");
    } catch {
      showError("Failed to connect wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [showError, showSuccess, showWarning]);

  const disconnectWallet = useCallback(() => {
    setPublicKey(null);
    setIsWalletConnected(false);
    localStorage.removeItem("stellar_wallet_public_key");
    // Freighter has no programmatic revoke API. Inform the user how to fully sever access.
    showWarning(
      "Disconnected. To fully revoke Freighter access, open the extension and remove this site from Connected Sites."
    );
  }, [showWarning]);

  const state = useMemo<WalletState>(
    () => ({ publicKey, isWalletConnected, isLoading }),
    [publicKey, isWalletConnected, isLoading]
  );

  const actions = useMemo<WalletActions>(
    () => ({ connectWallet, disconnectWallet }),
    [connectWallet, disconnectWallet]
  );

  return (
    <WalletStateContext.Provider value={state}>
      <WalletActionsContext.Provider value={actions}>{children}</WalletActionsContext.Provider>
    </WalletStateContext.Provider>
  );
};

/** Subscribe to wallet state only. Re-renders when connection state changes. */
export const useWalletState = (): WalletState => {
  const ctx = useContext(WalletStateContext);
  if (!ctx) throw new Error("useWalletState must be used within a WalletProvider");
  return ctx;
};

/**
 * Subscribe to wallet actions only. Never causes a re-render — prefer this in
 * components that only trigger connect/disconnect (buttons, menu items).
 */
export const useWalletActions = (): WalletActions => {
  const ctx = useContext(WalletActionsContext);
  if (!ctx) throw new Error("useWalletActions must be used within a WalletProvider");
  return ctx;
};

/**
 * Combined accessor, kept so existing call sites keep working. Subscribes to
 * both contexts — reach for `useWalletState` or `useWalletActions` instead when
 * a component only needs one half.
 */
export const useWallet = () => {
  const state = useWalletState();
  const actions = useWalletActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
