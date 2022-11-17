import { ApolloClient, InMemoryCache } from "@apollo/client";

export const chainlinkClient = createClient("https://api.thegraph.com/subgraphs/name/deividask/chainlink");
export const arbitrumGraphClient = createClient("https://api.thegraph.com/subgraphs/name/mycelium-ethereum/myc-swaps-stats");

export const arbitrumTestnetGraphClient = createClient("https://api.thegraph.com/subgraphs/name/tracer-protocol/arbitrum-rinkeby-gmx-stats");
export const nissohGraphClient = createClient("https://api.thegraph.com/subgraphs/name/dospore/gmx-vault");
export const arbitrumReferralsGraphClient = createClient("https://api.thegraph.com/subgraphs/name/mycelium-ethereum/myc-swaps-referrals");
export const arbitrumTestnetReferralsGraphClient = createClient("https://api.thegraph.com/subgraphs/name/mycelium-ethereum/myc-swaps-testnet-referrals");

function createClient(uri: string) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}
