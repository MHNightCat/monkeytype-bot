/** @format */

import * as fs from "fs";
import type { BananaEntry, BananaData, CoinFlip } from "../types";
import { parseJSON, readFileOrCreate } from "./file";

export function getUser(userID: string): BananaEntry | undefined {
  const data = getData();

  const user = data[userID];

  if (user === undefined) {
    return undefined;
  }

  return partialToFull(user);
}

export function setUser(userID: string, bananaEntry: BananaEntry): void {
  const data = getData();

  data[userID] = shakePartial(bananaEntry);

  setData(data);
}

export function createUser(userID: string, initialBal = 1): BananaEntry {
  const data = getData();

  const user = data[userID];

  if (user !== undefined) {
    return partialToFull(user);
  }

  const newUser: Partial<BananaEntry> = {
    balance: initialBal
  };

  data[userID] = newUser;

  setData(data);

  return partialToFull(newUser);
}

export function getData(): BananaData {
  return parseJSON(readFileOrCreate("bananas.json", "{}").toString());
}

function setData(bananaData: BananaData) {
  fs.writeFileSync("bananas.json", JSON.stringify(bananaData, null, 2));
}

function partialToFull(partial: Partial<BananaEntry>): BananaEntry {
  return {
    balance: partial.balance ?? 0,
    lastCollect: partial.lastCollect ?? 0,
    flipLosses: partial.flipLosses ?? 0,
    flipWins: partial.flipWins ?? 0,
    bananajackLosses: partial.bananajackLosses ?? 0,
    rpsWins: partial.rpsWins ?? 0,
    rpsLosses: partial.rpsLosses ?? 0,
    rpsTies: partial.rpsTies ?? 0,
    bananajackTies: partial.bananajackTies ?? 0,
    bananajackWins: partial.bananajackWins ?? 0
  };
}

function shakePartial(partial: Partial<BananaEntry>): Partial<BananaEntry> {
  if (partial.lastCollect === 0) {
    delete partial.lastCollect;
  }
  if (partial.flipLosses === 0) {
    delete partial.flipLosses;
  }
  if (partial.flipWins === 0) {
    delete partial.flipWins;
  }
  if (partial.bananajackLosses === 0) {
    delete partial.bananajackLosses;
  }
  if (partial.rpsWins === 0) {
    delete partial.rpsWins;
  }
  if (partial.rpsLosses === 0) {
    delete partial.rpsLosses;
  }
  if (partial.rpsTies === 0) {
    delete partial.rpsTies;
  }
  if (partial.bananajackTies === 0) {
    delete partial.bananajackTies;
  }
  if (partial.bananajackWins === 0) {
    delete partial.bananajackWins;
  }

  return partial;
}

export function getCoinFlips(): CoinFlip[] {
  const coinFlipsFile = readFileOrCreate("coinFlips.json", "[]").toString();

  return parseJSON(coinFlipsFile) ?? [];
}

export function setCoinFlips(coinFlips: CoinFlip[]): void {
  fs.writeFileSync("coinFlips.json", JSON.stringify(coinFlips, null, 2));
}
