"use client";
import Hero from "@/components/frontend/Hero";
import MainLayout from "./layouts/MainLayout";
import { FeaturesList } from "@/components/frontend/FeaturesGrid";

export default function Home() {

  return (
    <MainLayout>
        <Hero />
      <div className="max-w-screen-xl mx-auto text-gray-600 gap-x-12 ">
        <FeaturesList />
      </div>
    </MainLayout>
  );
}
