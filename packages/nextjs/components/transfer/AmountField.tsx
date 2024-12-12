import React, { FC } from "react";
import Image from "next/image";

type AmountFieldProp = {
  label: string;
  placeholder: string;
  value: string;
  onChange?: () => void;
  sendType?: boolean;
};

const AmountField: FC<AmountFieldProp> = ({ label, placeholder, value, onChange, sendType = true }) => {
  return (
    <div className="mb-4 px-3 py-2 rounded-md border border-slate-700">
      {/* Label */}
      <label className="text-sm font-medium mr-4 whitespace-nowrap capitalize">{label}</label>

      {/* input  */}
      <div className="flex flex-row items-center mt-3 bg-inherit rounded-md h-20 ">
        <input
          type="number"
          //   value={value}
          placeholder={placeholder}
          className="px-3 py-2 text-white text-4xl focus:outline-none bg-transparent w-full"
          min="0"
          step="any"
        />

        {/* Suffix */}
        <div className="flex flex-col py-2 px-4 text-center ">
          <div className="text-sm  text-gray-400 py-2 px-6 border-2 border-slate-400 rounded-md w-full flex flex-row justify-center">
            <Image alt="logo" height={15} width={15} src="/ethereum.svg" style={{ filter: "invert(100%)" }} />
            <span className="ml-2 font-semibold">ETH</span>
          </div>
          {sendType && <span className="text-sm text-gray-400 mt-2">0.000</span>}
        </div>
      </div>
    </div>
  );
};

export default AmountField;
