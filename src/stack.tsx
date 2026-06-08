import "server-only";
import { HexclaveServerApp } from "@hexclave/next";

export const stackServerApp = new HexclaveServerApp({
  tokenStore: "nextjs-cookie",
});