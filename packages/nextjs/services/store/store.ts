import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type GlobalState = {
  nativeCurrency: {
    price: number;
    isFetching: boolean;
  };
  setNativeCurrencyPrice: (newNativeCurrencyPriceState: number) => void;
  setIsNativeCurrencyFetching: (newIsNativeCurrencyFetching: boolean) => void;
  targetNetwork: ChainWithAttributes;
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  nativeCurrency: {
    price: 0,
    isFetching: true,
  },
  setNativeCurrencyPrice: (newValue: number): void =>
    set(state => ({ nativeCurrency: { ...state.nativeCurrency, price: newValue } })),
  setIsNativeCurrencyFetching: (newValue: boolean): void =>
    set(state => ({ nativeCurrency: { ...state.nativeCurrency, isFetching: newValue } })),
  targetNetwork: scaffoldConfig.targetNetworks[0],
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),
}));

export type Token = {
  id: number;
  name: string;
  chainId: number;
  chain: string;
  symbol: string;
  address: string;
  logo: string;
};

export const tokens: Token[] = [
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
  {
    id: 4,
    name: "BNB",
    chain: "BSC",
    chainId: 56,
    symbol: "BNB",
    address: "0xb8c77482e45f1f44de1745f52c74426c631bdd52",
    logo: "/BNB.svg",
  },
];

type State = {
  tokens: Token[];
  sourceToken: Token;
  destinationToken: Token;

  //Actions
  setSourceToken: (token: Token) => void;
  setDestinationToken: (token: Token) => void;
  updateTokenPrice: (symbol: string, price: number) => void;
};

export const useSelectedTokenStore = create<State>((set, get) => ({
  //Initial State
  tokens: tokens,
  sourceToken: tokens[0],
  destinationToken: tokens[1],

  //Actions
  setSourceToken: (token: Token) => {
    set(state => ({ sourceToken: token }));
  },
  setDestinationToken: (token: Token) => {
    set(state => ({ destinationToken: token }));
  },

  updateTokenPrice: (symbol: string, price: number) => {},
}));
