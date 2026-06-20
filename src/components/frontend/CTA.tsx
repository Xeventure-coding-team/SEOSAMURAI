import React from 'react';

function JoinSection() {
    return (
        <section className="lg:pb-32.5 md:pb-22.5 pb-10">
            <div className="container">
                <div className="grid md:grid-cols-11 md:gap-0 gap-7.5 bg-body-bg lg:p-25 md:p-10 p-5 relative rounded-md">
                    <div className="md:col-span-7">
                        <h3 className="font-bold lg:text-6xl md:text-[55px] text-3xl text-white mb-2.5">
                            Ready to grow your visibility on Google?
                        </h3>

                        <p className="my-7.5 text-white">
                            Join businesses and agencies using Rankerly to track rankings, manage reviews, automate posts, and uncover new opportunities across Google Search and Maps—all from one platform.
                        </p>

                        <div>
                            <a
                                href="/handler/sign-up"
                                className="py-2.5 px-7.5 bg-white rounded justify-center items-center gap-2 inline-flex group"
                            >
                                <div className="rounded-full bg-body-bg size-5.5 flex justify-center items-center text-white">
                                    <i className="iconify tabler--arrow-narrow-right size-4 transition-transform duration-700 transform group-hover:-rotate-45"></i>
                                </div>

                                <div className="text-body-bg">
                                    Start Free
                                </div>
                            </a>
                        </div>

                        <div className="mt-2.5">
                            <a href="/contact" className="underline text-white">
                                Need a plan for your team or agency? Contact sales
                            </a>
                        </div>
                    </div>


                    <div className="md:col-span-4 flex items-center justify-center">
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 w-full max-w-[280px]">

                            <div className="text-white text-sm font-medium mb-5">
                                Why teams choose Rankerly
                            </div>

                            <div className="space-y-4">

                                <div>
                                    <div className="text-2xl font-bold text-white">24/7</div>
                                    <div className="text-sm text-white/60">
                                        Visibility monitoring
                                    </div>
                                </div>

                                <div>
                                    <div className="text-2xl font-bold text-white">AI</div>
                                    <div className="text-sm text-white/60">
                                        Reviews & post creation
                                    </div>
                                </div>

                                <div>
                                    <div className="text-2xl font-bold text-white">Multi-location</div>
                                    <div className="text-sm text-white/60">
                                        Built for growing businesses
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default JoinSection;