import React, { FC, useEffect, useState } from "react";
import Image from "next/image";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import Popup from "reactjs-popup";
import { useBalance } from "wagmi";
import { useAccount } from "wagmi";
import { getDestinationToken, getSourceToken, setDestinationToken, setSourceToken } from "~~/services/store/helpers";
import { Token, tokens, useSelectedTokenStore } from "~~/services/store/store";

type AmountFieldProp = {
  onChange?: () => void;
  sendType?: boolean;
};

const AmountField: FC<AmountFieldProp> = ({ onChange, sendType = true }) => {
  const tokens = useSelectedTokenStore(state => state.tokens);
  let token = sendType ? getSourceToken() : getDestinationToken();
  const [open, setOpen] = useState<boolean>(false);
  const account = useAccount();

  const {
    data: balance,
    isLoading,
    isError,
  } = useBalance({
    address: account?.address,
    token: token?.address,
    chainId: token?.chainId,
  });

  const closeModal = () => setOpen(false);
  const selectToken = (selectedToken: Token) => {
    if (sendType) {
      setSourceToken(selectedToken);
      token = getSourceToken();
    } else {
      setDestinationToken(selectedToken);
      token = getDestinationToken();
    }

    setOpen(false);
  };

  return (
    <div className="mb-4 px-3 py-2 rounded-md border border-slate-700">
      {/* Label */}
      <label className="text-sm font-medium mr-4 whitespace-nowrap capitalize">
        {sendType ? "Send" : "Destination"}
      </label>

      {/* input  */}
      <div className="flex flex-row items-center mt-3 bg-inherit rounded-md h-20 ">
        <input
          type="number"
          //   value={value}
          placeholder={"0"}
          className="px-3 py-2 text-white text-4xl focus:outline-none bg-transparent w-full"
          min="0"
          step="any"
        />

        {/* Suffix */}
        <div className="flex flex-col py-2 px-4 text-center ">
          <div
            className="btn btn-primary btn-md text-sm  px-6 max-w-sm flex flex-row flex-nowrap justify-center"
            role="button"
            aria-label="select token"
            onClick={() => setOpen(open => !open)}
          >
            {/* style={{ filter: "invert(100%)" }} */}
            <Image alt="logo" height={15} width={15} src={token.logo} />
            <span className="ml-2 font-semibold flex flex-row items-center cursor-pointer ">
              {token.symbol.toUpperCase()}{" "}
              <span className="ml-2">
                <FaAngleDown />
              </span>
            </span>
          </div>
          {sendType && (
            <span className="text-sm text-gray-400 mt-2">
              {isLoading ? "0.00" : balance?.formatted} <span className="uppercase">max</span>
            </span>
          )}

          {/* Modal  */}
          <Popup open={open} closeOnDocumentClick onClose={closeModal}>
            <div className="flex flex-col w-96 p-4 bg-popbg border  text-slate-300 shadow-lg rounded-md z-10">
              {/* Header Section */}
              <div className="flex flex-row justify-between items-center mb-2">
                {/* <p className="text-lg font-semibold capitalize">Select a Token</p> */}
                <input
                  type="text"
                  // value={}
                  placeholder="Search Token"
                  className="px-2 py-1 text-white text-md focus:outline-none bg-transparent w-full"
                />
                <div
                  className="cursor-pointer text-gray-400 hover:text-white"
                  onClick={() => setOpen(open => !open)}
                  aria-label="Close"
                >
                  <FaTimes size={20} />
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-gray-600 mb-2"></div>

              {/* Tokens List */}
              <div className="h-48 overflow-y-scroll overflow-x-hidden">
                {tokens.map((token, index) => (
                  <div
                    key={index}
                    className="flex items-center px-4 py-1 rounded-md cursor-pointer transition-transform transform hover:scale-105 hover:bg-popbg "
                    onClick={() => selectToken(token)}
                  >
                    <img alt={token.name} height={24} width={24} src={token.logo} className="mr-3" />
                    <div>
                      <p className="font-semibold">{token.symbol}</p>
                      <p className="text-sm text-gray-400">{token.chain}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        </div>
      </div>
    </div>
  );
};

export default AmountField;
