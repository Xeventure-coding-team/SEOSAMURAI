import React from 'react'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { ArrowRight, BarChart3, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'

function HowItWorks() {
    return (
        <section className="lg:py-32.5 md:py-22.5 py-10">
            <div className="container">
                <div className="grid lg:grid-cols-2 gap-17.5 items-center lg:mt-0 mt-10">

                    <div className="col-span-1 lg:block md:flex hidden lg:justify-self-auto md:justify-center">
                        <div className="size-100 bg-light-400 dark:bg-white/[0.03] relative rounded-lg border border-transparent dark:border-white/10">

                            <div className="absolute -top-[17%] -start-[31%]">
                                <img
                                    src="marketing/5.svg"
                                    alt=""
                                    className="-rotate-87"
                                />
                            </div>

                            <div className="flex gap-7.5 w-130 rounded bg-white dark:bg-zinc-900 border-2 border-primary items-center justify-center absolute -top-[23%] -start-[5%] shadow-[0_1px_20px_7px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_20px_7px_rgba(0,0,0,0.3)] py-3.75 px-2.5">

                                <div className="flex -space-x-4">
                                    <Avatar className="size-15.5 border-2 border-light-300 bg-blue-500">
                                        <AvatarFallback className="bg-blue-500 text-white">
                                            A
                                        </AvatarFallback>
                                    </Avatar>

                                    <Avatar className="size-15.5 border-2 border-light-300 bg-violet-500">
                                        <AvatarFallback className="bg-violet-500 text-white">
                                            M
                                        </AvatarFallback>
                                    </Avatar>

                                    <Avatar className="size-15.5 border-2 border-light-300 bg-emerald-500">
                                        <AvatarFallback className="bg-emerald-500 text-white">
                                            S
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                <div>
                                    <div className="text-xl text-gray-900 dark:text-white mb-2">
                                        Your workspace is ready
                                    </div>

                                    <p className="mb-2.5 text-gray-600 dark:text-gray-400">
                                        Connect your locations and start tracking your local visibility in minutes.
                                    </p>

                                    <div className="size-9 bg-primary rounded-full flex justify-center items-center absolute -top-5 bottom-auto left-auto -right-4">
                                        <i className="iconify tabler--check text-white size-6 font-bold" />
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-[14%] bottom-auto start-auto end-[0%]">
                                <img src="marketing/4.svg" alt="" />
                            </div>

                            <div className="absolute top-[43%] bottom-auto -start-[25%] end-auto rounded shadow-[0_1px_20px_7px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_20px_7px_rgba(0,0,0,0.3)]">
                                <img
                                    src="/marketing/how-1.jpg"
                                    alt=""
                                    className="h-100 rounded"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1">
                        <div className="text-xl text-primary mb-5 uppercase font-bold lg:mt-0 md:mt-5">
                            How It Works
                        </div>

                        <h3 className="lg:text-6xl md:text-[55px] text-3xl mb-2.5 font-bold text-gray-900 dark:text-white">
                            Grow your local presence with confidence
                        </h3>

                        <p className="mb-10 text-gray-600 dark:text-gray-400">
                            Rankerly helps businesses understand their visibility on Google Search and Maps, manage their reputation, and automate everyday tasks from one unified platform.
                        </p>

                        <div>

                            <div className="flex gap-7.5 mb-12.5">
                                <MapPin className="size-13 text-primary" />

                                <div>
                                    <h4 className="text-gray-900 dark:text-white text-2xl font-bold">
                                        Connect your locations
                                    </h4>

                                    <p className="mb-2.5 text-gray-600 dark:text-gray-400">
                                        Organize and manage all of your business locations from a single workspace designed for growing teams.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-7.5 mb-12.5">
                                <BarChart3 className="size-13 text-primary" />

                                <div>
                                    <h4 className="text-gray-900 dark:text-white text-2xl font-bold">
                                        Monitor your visibility
                                    </h4>

                                    <p className="mb-2.5 text-gray-600 dark:text-gray-400">
                                        Track rankings, analyze competitors, and understand how customers find your business across different areas.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-7.5 mb-12.5">
                                <Sparkles className="size-13 text-primary" />

                                <div>
                                    <h4 className="text-gray-900 dark:text-white text-2xl font-bold">
                                        Automate and scale
                                    </h4>

                                    <p className="mb-2.5 text-gray-600 dark:text-gray-400">
                                        Save time with AI-powered workflows for reviews, posts, and reputation management as your business grows.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap">
                                <Link
                                    href="/handler/sign-up"
                                    className="
      group inline-flex items-center gap-3
      rounded-xl bg-primary px-7 py-3.5
      text-primary-foreground
      shadow-sm transition-all duration-200
      hover:bg-primary/90 hover:shadow-md
    "
                                >
                                    <div className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/15">
                                        <ArrowRight className="size-4 transition-transform duration-300 group-hover:-rotate-45" />
                                    </div>

                                    <span className="font-medium">Explore Rankerly</span>
                                </Link>

                                <Link
                                    href="/pricing"
                                    className="
      group inline-flex items-center gap-2
      rounded-xl border border-border
      bg-background px-7 py-3.5
      text-foreground
      shadow-sm transition-all duration-200
      hover:bg-muted hover:shadow-md
    "
                                >
                                    <span className="font-medium">View Pricing</span>

                                    <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
                                </Link>
                            </div>


                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default HowItWorks