import React from "react";
import AmountField from "./AmountField";
import ReceivingWalletInput from "./ReceivingWalletInput";
import Divider from "~~/snippets/divider/divider";

const TransferCard = () => {
  return (
    <div className="w-[85%] max-w-[650px] bg-transparent p-6 rounded-lg shadow-lg border border-slate-50">
      {/* Title */}
      <h2 className="text-2xl font-semibold semibold mb-4 text-left">Transfer</h2>
      <ReceivingWalletInput />
      <AmountField label="Send" placeholder="0" value="0" />
      <Divider />
      <AmountField label="Receive" placeholder="0" value="0" sendType={false} />
    </div>
  );
};

export default TransferCard;
