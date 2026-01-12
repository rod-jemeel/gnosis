// Stub for optional @supabase/auth-js web3 features
// These are only needed for Web3/Ethereum authentication which we don't use

export function createSiweMessage() {
  throw new Error("Web3 authentication is not supported");
}

export function fromHex() {
  throw new Error("Web3 authentication is not supported");
}

export function getAddress() {
  throw new Error("Web3 authentication is not supported");
}

export function toHex() {
  throw new Error("Web3 authentication is not supported");
}
