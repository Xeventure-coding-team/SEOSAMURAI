"use client";
import Hero from "@/components/frontend/Hero";
import { FeaturesList } from "@/components/frontend/FeaturesGrid";
import ContentSection from "@/components/frontend/FeatureIntro";
import SalesSection from "@/components/frontend/FeaturesTab";
import HowItWorks from "@/components/frontend/HowItWorks";
import FAQ from "@/components/frontend/FAQ";
import JoinSection from "@/components/frontend/CTA";
import MainLayout from "@/app/layouts/MainLayout";

export default function HomePage() {

  return (
    <div>
      <MainLayout>
        <Hero />

        <section className="lg:py-10 md:py-10 py-10 bg-body-bg mb-32">
          <div className="container">
            <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-6">
              <p className="text-md uppercase tracking-widest text-light-200">
                Trusted by local businesses worldwide
              </p>
              <div className="flex flex-wrap items-center gap-12">
                <div className="text-center">
                  <div className="text-[28px] font-medium tracking-tight text-white leading-tight">1,200+</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-light-200">Users</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[28px] font-medium tracking-tight text-white leading-tight">30+</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-light-200">Countries</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[28px] font-medium tracking-tight text-white leading-tight">4,800+</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-light-200">Google Business Profiles</div>
                </div>
              </div>
            </div>
          </div>
        </section>


        <ContentSection />

        <SalesSection />
        <HowItWorks />
        <FAQ />
        <JoinSection />

      </MainLayout>
    </div>
  );
}
