"use client";

// @refresh reset
import Image from "next/image";
import { Balance } from "../Balance";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * Custom Wagmi Connect Button with "Disconnect" functionality.
 */
export const RainbowKitCustomConnectButton = () => {
  // const networkColor = useNetworkColor();
  const { disconnect } = useDisconnect();
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button
                    className="btn btn-primary btn-md px-6 py-3 rounded-md "
                    onClick={openConnectModal}
                    type="button"
                  >
                    <Image alt="logo" width={15} height={15} src="/ethereum.svg" />
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return (
                  <div className="text-red-500 text-sm">
                    Unsupported network! Please switch to {targetNetwork.name}.
                  </div>
                );
              }

              return (
                <button
                  className="btn btn-primary btn-md h-2 px-6 py-2 rounded-md"
                  onClick={() => disconnect()}
                  type="button"
                >
                  <Image alt="logo" width={15} height={15} src="/ethereum.svg" />
                  <span>{`Disconnect ${account.address.slice(0, 4)}...${account.address.slice(-4)}`}</span>
                </button>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
