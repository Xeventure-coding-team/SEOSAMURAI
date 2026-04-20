import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "../../../../lib/prisma";
import WebsiteClient from "@/components/website/website-client";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

function WebsiteSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-16 bg-white border-b border-gray-100 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-72 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="w-20 h-20 bg-gray-300/50 rounded-2xl mb-6" />
          <div className="w-80 h-10 bg-gray-300/50 rounded mb-4" />
          <div className="w-64 h-6 bg-gray-300/40 rounded" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1 h-10 bg-gray-200 rounded-full" />
              <div className="w-40 h-7 bg-gray-200 rounded" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-40 bg-gray-100 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function TenantWebsite({ params }: PageProps) {
  const { subdomain } = await params;

  const website = await prisma.website.findUnique({
    where: { subdomain, isPublished: true },
    include: { cachedData: true },
  });

  if (!website) {
    notFound();
  }

  return (
    <Suspense fallback={<WebsiteSkeleton />}>
      <WebsiteClient website={website as any} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await prisma.website.findUnique({
    where: { subdomain },
    select: {
      title: true,
      description: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!website) {
    return {
      title: "Not Found",
      description: "The requested website could not be found.",
    };
  }

  return {
    title: website.title,
    description: website.description ?? undefined,
    icons: website.logoUrl ? { icon: website.logoUrl } : undefined,
    themeColor: website.primaryColor ?? "#3b82f6",
    openGraph: {
      title: website.title,
      description: website.description ?? undefined,
      type: "website",
    },
  };
}