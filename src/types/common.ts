import { CHART_PERIODS } from "../Helpers";
import { Web3ReactContextInterface } from "@web3-react/core/dist/types";

export type ChainId = number; 
export type TokenSymbol = string; 
export type Period = keyof typeof CHART_PERIODS


export type Library = Web3ReactContextInterface["library"];
