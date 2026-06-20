"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  MapPinned,
  MessageSquareMore,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

export default function HeroSection() {
  return (
    <section className="lg:py-32.5 md:py-22.5 py-10 overflow-hidden">
      <div className="container">
        <div className="grid lg:grid-cols-2 lg:gap-x-4 md:gap-y-12.5 gap-y-10 lg:relative">

          {/* LEFT */}
          <div>

            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-gradient-to-r from-background/80 to-background px-4 py-2 text-sm mb-8 shadow-sm backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute h-full w-full rounded-full bg-blue-500 opacity-40 blur-sm" />
                <span className="relative size-2 rounded-full bg-blue-500" />
              </span>
              <span className="text-muted-foreground">
                Powering growth with{" "}
                <span className="text-foreground font-medium">
                  Local SEO
                </span>
              </span>
            </div>

            <h1 className="lg:text-7xl md:text-[65px] text-[38px] font-bold leading-[1.05] mb-6 text-foreground">
              Help your business
              <span className="text-primary"> show up </span>
              and grow everywhere.
            </h1>

            <p className="text-muted-foreground text-lg max-w-xl">
              Rank higher on Google Maps, automate posting and manage reviews
              for all your locations from one dashboard.
            </p>

            {/* Features */}
            <div className="flex lg:gap-8 gap-5 lg:my-14 my-8 flex-wrap">
              <div className="flex gap-2 items-center">
                <MapPinned className="size-5 text-primary" />
                <span className="font-medium text-foreground">
                  Google Maps Rankings
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <MessageSquareMore className="size-5 text-primary" />
                <span className="font-medium text-foreground">
                  Review Management
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Star className="size-5 text-primary" />
                <span className="font-medium text-foreground">
                  Automated Posting
                </span>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center gap-5 mb-10">

              {/* Avatars */}
              <div className="flex -space-x-3">
                <Avatar className="size-12 border-2 border-background shadow-md">
                  <AvatarFallback className="bg-blue-500 text-white">J</AvatarFallback>
                </Avatar>
                <Avatar className="size-12 border-2 border-background shadow-md">
                  <AvatarFallback className="bg-violet-500 text-white">A</AvatarFallback>
                </Avatar>
                <Avatar className="size-12 border-2 border-background shadow-md">
                  <AvatarFallback className="bg-emerald-500 text-white">S</AvatarFallback>
                </Avatar>
              </div>

              {/* Rating */}
              <div>
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="ml-2 text-sm font-semibold text-foreground">
                    4.9/5
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Helping agencies and multi-location businesses improve visibility.
                </p>
              </div>

            </div>

            {/* Button */}

            {/* Buttons */}
            <div className="lg:mb-20 mb-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/handler/signup">
                  Start ranking higher
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

<Button
  size="lg"
  variant="outline"
  className="
    rounded-xl
    border-border
    bg-background
    px-6
    shadow-sm
    transition-all
    duration-200
    hover:bg-muted
    hover:border-primary/20
    hover:shadow-md
    text-foreground
  "
  asChild
>
  <Link href="/pricing">
    Explore plans
  </Link>
</Button>

            </div>

          </div>

          {/* RIGHT */}
          <div className="lg:transform lg:-rotate-8 lg:absolute lg:-top-16 lg:-right-[560px] md:static">
            <div className="relative">

              <Image
                src="/marketing/1.png"
                alt="Rankerly geo grid rank tracker"
                width={1100}
                height={800}
                className="lg:w-[1000px] xl:w-[1100px] shadow-2xl rounded-2xl border border-gray-100 dark:border-zinc-800 dark:brightness-90"
                priority
              />

              <img
                src="/marketing/hero_2.jpg"
                alt=""
                className="absolute lg:-top-11 md:-top-7 lg:left-1/2 lg:-translate-x-1/2 md:left-35 right-auto md:h-20 lg:h-24 md:block hidden dark:brightness-90 rounded-xl border border-gray-200 shadow-lg"
              />

              <img
                src="/marketing/hero_1.jpg"
                alt=""
                className="absolute top-auto lg:-bottom-6 md:bottom-6 lg:-left-25 md:left-5.5 right-auto md:w-80 md:block hidden rounded-2xl border border-gray-200 shadow-xl dark:brightness-90"
              />

              <img
                src="/marketing/11.svg"
                alt=""
                className="lg:absolute lg:top-auto lg:bottom-46.5 lg:-left-44 lg:-right-44 lg:transform lg:-rotate-44 lg:block hidden dark:invert dark:opacity-20"
              />

              <img
                src="/marketing/12.svg"
                alt=""
                className="lg:absolute lg:top-15.5 lg:bottom-auto lg:-left-14 lg:right-auto lg:transform lg:rotate-51 lg:block hidden dark:invert dark:opacity-20"
              />

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}