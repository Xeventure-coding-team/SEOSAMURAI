import "server-only";
import { HexclaveServerApp } from "@hexclave/next";

export const stackServerApp = new HexclaveServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/sign-in",
    signUp: "/sign-up",
    forgotPassword: "/forgot-password",
    passwordReset: "/password-reset",
    emailVerification: "/verify-email",

    afterSignIn: "/auth/redirect",
    afterSignUp: "/auth/redirect",
  },
});