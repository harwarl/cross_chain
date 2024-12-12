import React from "react";

const ReceivingWalletInput = () => {
  return (
    <div className="flex items-center mb-4 px-3 py-2 rounded-md border border-slate-700">
      <label className="flex-grow text-sm font-medium capitalize -mr-8">Receiving Wallet Address: </label>
      <input
        type="input"
        placeholder="Enter Wallet Address"
        className="flex-grow px-3 py-3 bg-inherit text-white rounded-md focus:outline-none overflow-hidden"
      />
    </div>
  );
};

export default ReceivingWalletInput;
