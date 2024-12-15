import React from "react";
import AmountField from "./AmountField";
import ReceivingWalletInput from "./ReceivingWalletInput";
import { useSelectedTokenStore } from "~~/services/store/store";
import Divider from "~~/snippets/divider/divider";

const TransferCard = () => {
  const { sourceToken, destinationToken, setSourceToken, setDestinationToken } = useSelectedTokenStore();

  const swapTokens = () => {
    setSourceToken(destinationToken);
    setDestinationToken(sourceToken);
  };
  
  return (
    <div className="w-[85%] max-w-[650px] bg-transparent p-6 rounded-lg shadow-lg border border-slate-50">
      {/* Title */}
      <h2 className="text-2xl font-semibold semibold mb-4 text-left">Transfer</h2>
      <ReceivingWalletInput />
      <AmountField />
      <Divider onClick={swapTokens} />
      <AmountField sendType={false} />
    </div>
  );
};

export default TransferCard;
