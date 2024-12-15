import { Token, useSelectedTokenStore } from "./store";

export function getSourceToken() {
  const sourceToken: Token = useSelectedTokenStore.getState().sourceToken;
  return sourceToken;
}

export function getDestinationToken() {
  const destinationToken: Token = useSelectedTokenStore.getState().destinationToken;
  return destinationToken;
}

export function setSourceToken(token: Token) {
  useSelectedTokenStore.setState({ sourceToken: token });
}

export function setDestinationToken(token: Token) {
  useSelectedTokenStore.setState({ destinationToken: token });
}
