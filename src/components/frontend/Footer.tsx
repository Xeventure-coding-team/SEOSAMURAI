import Link from "next/link";
import { siteConfig } from "@/config/site";
import Logo from "../Logo";

export default function Footer() {
  const half = Math.ceil(siteConfig.products.length / 2);
  const col1 = siteConfig.products.slice(0, half);
  const col2 = siteConfig.products.slice(half);

  return (
    <footer>
      <div className="container">
        <div className="h-0.25 w-full bg-gray-200 dark:bg-white/10" />

        {/* Main grid */}
        <div className="grid lg:grid-cols-12 md:grid-cols-6 gap-8 lg:my-22.5 md:my-17.5 my-10">

          {/* Products */}
          <div className="lg:col-span-5 md:col-span-3">
            <h6 className="text-2xl font-medium mb-8 text-gray-900 dark:text-white">
              Product
            </h6>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 leading-normal text-gray-600 dark:text-gray-400">
              {[...col1, ...col2].map(({ title, url }) => (
                <Link
                  key={url}
                  href={url}
                  className="transition-all duration-300 hover:text-primary"
                >
                  {title}
                </Link>
              ))}
            </div>
          </div>

          {/* Company + Legal */}
          <div className="lg:col-span-3 md:col-span-3">
            <h6 className="text-2xl font-medium mb-8 text-gray-900 dark:text-white">
              Company
            </h6>

            <ul className="flex flex-col gap-4 leading-normal text-gray-600 dark:text-gray-400">
              {siteConfig.footerLinks.company.map(({ title, url }) => (
                <li key={url}>
                  <Link
                    href={url}
                    className="transition-all duration-300 hover:text-primary"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>

            <h6 className="text-2xl font-medium mb-8 mt-10 text-gray-900 dark:text-white">
              Legal
            </h6>

            <ul className="flex flex-col gap-4 leading-normal text-gray-600 dark:text-gray-400">
              {siteConfig.footerLinks.legal.map(({ title, url }) => (
                <li key={url}>
                  <Link
                    href={url}
                    className="transition-all duration-300 hover:text-primary"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA card */}
          <div className="lg:col-span-4 md:col-span-6">
            <div className="bg-primary px-8 py-10 rounded-xl h-full flex flex-col justify-between gap-8">

              {/* CTA */}
              <div className="flex flex-col gap-5">
                <h6 className="text-white text-2xl font-bold leading-snug">
                  Start growing locally today
                </h6>

                <p className="text-white/80 leading-relaxed">
                  Automate your Google Business Profile management and rank
                  higher in local search — without the manual effort.
                </p>

                <p className="text-white/80 leading-relaxed">
                  Trusted by businesses looking to save time, improve local visibility,
                  and grow with confidence.
                </p>

                <div>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded transition-all duration-300 hover:bg-white/90"
                  >
                    Get started free →
                  </Link>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-white/20" />

              {/* Contact */}
              <div className="flex flex-col gap-3">
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex items-center gap-3 text-white/80 text-sm hover:text-white transition-colors duration-300"
                >
                  <i className="iconify tabler--mail-filled size-4 shrink-0" />
                  {siteConfig.contact.email}
                </a>

                {siteConfig.contact.phone && (
                  <a
                    href={`tel:${siteConfig.contact.phone}`}
                    className="flex items-center gap-3 text-white/80 text-sm hover:text-white transition-colors duration-300"
                  >
                    <i className="iconify tabler--phone-filled size-4 shrink-0" />
                    {siteConfig.contact.phone}
                  </a>
                )}

                {siteConfig.contact.address && (
                  <div className="flex items-start gap-3 text-white/80 text-sm">
                    <i className="iconify tabler--map-pin-filled size-4 shrink-0 mt-0.5" />
                    {siteConfig.contact.address}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        <div className="h-0.25 w-full bg-gray-200 dark:bg-white/10" />

        {/* Bottom bar */}
        <div className="grid md:grid-cols-4 md:gap-4 md:my-10 my-7 gap-5 items-center">

          <div className="col-span-1">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          <div className="md:col-span-2 col-span-1">
            <div className="lg:text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} {siteConfig.name}. All rights
                reserved.
              </p>
            </div>
          </div>

          <div className="col-span-1">
            <div className="flex gap-5 md:justify-end">
              {siteConfig.social.map(({ icon: Icon, url, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-600 dark:text-gray-400 transition-all duration-300 hover:text-primary"
                >
                  <Icon size={22} />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}