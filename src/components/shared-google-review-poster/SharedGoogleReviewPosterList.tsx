"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, QrCode } from "lucide-react";

export default function SharedGoogleReviewPosterList() {
  // Later you can fetch these from API
  const posters = [];

  return (
      <div className="container mx-auto space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Google Review Posters</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Manage all your Google Review posters here. Generate new posters with QR codes to
              share with your customers for easy reviews.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/app/shared-google-review-poster/create">
              <Plus className="h-5 w-5 mr-2" />
              Create New Poster
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="border rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">{poster.businessName}</h3>
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Created on {poster.createdAt}
              </p>
              <div className="flex justify-between items-center">
                <Link
                  href={`/app/shared-google-review-poster/${poster.id}`}
                  className="text-primary hover:underline text-sm"
                >
                  View Poster
                </Link>
                <Link
                  href={poster.sharedUrl}
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Open Link ↗
                </Link>
              </div>
            </div>
          ))}

          {posters.length === 0 && (
            <div className="text-center py-12 text-muted-foreground col-span-full">
              No posters found. Click “Create New Poster” to start.
            </div>
          )}
        </div>
      </div>
  );
}
