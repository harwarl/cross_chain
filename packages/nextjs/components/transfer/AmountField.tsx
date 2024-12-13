import React, { FC, useEffect, useState } from "react";
import Image from "next/image";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import Popup from "reactjs-popup";
import { useBalance } from "wagmi";
import { useAccount } from "wagmi";

type AmountFieldProp = {
  label: string;
  placeholder: string;
  value: string;
  onChange?: () => void;
  sendType?: boolean;
};

interface iToken {
  id: number;
  name: string;
  chainId: number;
  chain: string;
  symbol: string;
  address: string;
  logo: string;
}

const tokens: iToken[] = [
  {
    id: 1,
    name: "Ethereum",
    chainId: 1,
    chain: "ETH",
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000",
    logo: "/ethereum.svg",
  },
  {
    id: 2,
    name: "Ethereum",
    chainId: 11155111, // Sepolia Chain ID
    chain: "Sepolia",
    symbol: "ETH",
    address: "0xd38E5c25935291fFD51C9d66C3B7384494bb099A",
    logo: "/ethereum.svg",
  },
  {
    id: 3,
    name: "Tether USD",
    chain: "ETH",
    chainId: 1,
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    logo: "/tether.svg",
  },
];

const AmountField: FC<AmountFieldProp> = ({ label, placeholder, value, onChange, sendType = true }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const account = useAccount();

  // useEffect(() => {
  //   //Get the users Balance
  //   const {
  //     data: balance,
  //     isLoading: loading,
  //     isError,
  //   } = useBalance({
  //     address: account.address,
  //     token: selectedToken.address,
  //   });

  //   console.log(balance);
  // }, [selectedToken]);

  const {
    data: balance,
    isLoading,
    isError,
  } = useBalance({
    address: account?.address,
    token: selectedToken?.address,
    chainId: selectedToken?.chainId,
  });

  console.log({ balance });

  const closeModal = () => setOpen(false);
  const selectToken = (token: any) => {
    setSelectedToken(token);
    setOpen(false);
  };

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
          <div
            className="btn btn-primary btn-md text-sm  px-6 max-w-sm flex flex-row flex-nowrap justify-center"
            role="button"
            aria-label="select token"
            onClick={() => setOpen(open => !open)}
          >
            {/* style={{ filter: "invert(100%)" }} */}
            <Image alt="logo" height={15} width={15} src={selectedToken.logo} />
            <span className="ml-2 font-semibold flex flex-row items-center cursor-pointer ">
              {selectedToken.symbol.toUpperCase()}{" "}
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
