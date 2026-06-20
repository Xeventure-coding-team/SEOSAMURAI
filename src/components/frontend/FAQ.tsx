"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Rankerly used for?",
    answer:
      "Rankerly helps businesses improve their visibility on Google Search and Maps through rank tracking, review management, posting automation, and location insights.",
  },
  {
    question: "Can I manage multiple business locations?",
    answer:
      "Yes. Rankerly is built for multi-location businesses and agencies, allowing you to manage all locations from a single dashboard.",
  },
  {
    question: "Does Rankerly track keyword rankings?",
    answer:
      "Yes. You can monitor local keyword rankings, analyze competitors, and view geo-grid performance across different areas.",
  },
  {
    question: "Can I automate Google Business Profile posts?",
    answer:
      "Absolutely. Rankerly supports scheduled posts, bulk posting, AI-powered post creation, and automated publishing workflows.",
  },
  {
    question: "Does Rankerly help with reviews and reputation management?",
    answer:
      "Yes. You can monitor reviews, detect deleted reviews, and generate AI-powered replies to maintain a strong online reputation.",
  },
];

function FAQ() {
  return (
    <section className="pb-10 md:pb-22.5 lg:pb-32.5">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-2 lg:gap-25">
          <div>
            <h3 className="mb-2.5 text-3xl font-bold text-foreground md:text-[55px] lg:text-6xl">
              Frequently Asked Questions
            </h3>
          </div>

          <div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                >
                  <AccordionTrigger className="text-left text-base font-medium text-foreground">
                    {faq.question}
                  </AccordionTrigger>

                  <AccordionContent className="text-base leading-7 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQ;