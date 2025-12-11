import { ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import SphereAnimation from "../eldoraui/sphere-animation"
import Squares from "../Squares"
import { useStackApp, useUser } from "@stackframe/stack"
import { useRouter } from "next/navigation"                // App Router navigation

export default function Hero() {

  const user = useUser()
  const stackApp = useStackApp()
  const router = useRouter()

  const handleGetStarted = () => {
    if (user) {
      router.push("app/dashboard")
    } else {
      // User not logged in → redirect to sign-in (and return to home after login)
      //   stackApp.redirectToSignIn(
      //     // Optional: redirect back to home after sign-in
      //     {
      //     redirectTo: "/",
      //   }
      // )
      router.push("handler/signup")
    }
  }
  return (
    <div className="relative w-full flex flex-col overflow-hidden">

      {/* Squares Background - Behind everything with very low opacity */}
      <div className="absolute inset-0 -z-10 opacity-5">
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal' // up, down, left, right, diagonal
          borderColor='#fff'
          hoverFillColor='#222'
        />
      </div>

      {/* Background Image */}
      <img
        className="absolute top-0 z-0 -translate-y-1/3 opacity-40"
        src="https://farmui.vercel.app/bg-back.png"
        width={1000}
        height={1000}
        alt="background"
      />

      {/* Grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[640px] opacity-30
                   bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)]
                   bg-[size:6rem_4rem]
                   [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,_#000_70%,_transparent_110%)]"
      />

      <div className="max-w-screen-xl mx-auto text-foreground relative z-10">
        <div className="relative flex flex-col">
          <section>
            <div className="grid md:grid-cols-2 items-center gap-6 pt-12 sm:pt-16 px-4">
              {/* Left Content */}
              <div className="space-y-5">
                <div className="inline-flex items-center text-sm px-4 py-1.5 rounded-full border bg-muted text-muted-foreground shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm">
                  Trusted by 200+ businesses worldwide
                  <ChevronRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  Grow Your Business Visibility with Smart GMB Tasks
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground max-w-lg">
                  Our platform makes managing your Google Business Profile simple with AI-powered insights and clear
                  monthly tasks. Post updates, respond to reviews, and track performance—all from one easy dashboard.
                </p>

                <div className="flex items-center gap-4">
                  <Button size="lg" className="rounded-full shadow-sm hover:shadow-md"
                    onClick={handleGetStarted}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right Content - Sphere with darker overlay */}
              <div className="relative flex items-center justify-center min-h-[520px] sm:min-h-[580px] md:min-h-[640px]">
                {/* Dark overlay on sphere area */}
                <div className="absolute inset-0 bg-background/50 dark:bg-background/70 rounded-full blur-3xl" />
                <div className="relative z-10 scale-150">
                  <SphereAnimation />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom dark gradient to blend with next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent z-0" />
    </div>
  )
}