import { HexclaveHandler } from "@hexclave/next";
import { stackServerApp } from "../../../stack";

export default function Handler(props: unknown) {
  return <HexclaveHandler fullPage app={stackServerApp} routeProps={props} />;
}