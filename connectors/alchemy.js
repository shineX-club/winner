import { Alchemy, Network } from "alchemy-sdk";

const config = {
  apiKey: "fujfpMivwfgnuQ8NR5FeqAfnFVqt-957",
  network: Network.ETH_GOERLI,
}

export const alchemy = new Alchemy(config)
