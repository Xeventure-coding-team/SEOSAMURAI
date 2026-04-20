import type { Metadata } from "next";
import { prisma } from "../../../../lib/prisma";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}

export default async function SubdomainLayout({ children, params }: LayoutProps) {
  return <>{children}</>;
}