"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFaqContent, type FaqCategory, type FaqQuestion } from "@/lib/services/contentService";
import {
  HelpCircle,
  CreditCard,
  Clock,
  Ticket,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  HelpCircle,
  CreditCard,
  Clock,
  Ticket,
};

const getIcon = (name: string) => iconMap[name] || HelpCircle;

export default function FAQ() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [questions, setQuestions] = useState<FaqQuestion[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("faq-section");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { categories: cats, questions: qs } = await fetchFaqContent();
        setCategories(cats);
        setQuestions(qs);
        if (cats.length > 0) {
          setActiveTab(cats[0].id);
        }
      } catch (error) {
        console.error("Failed to load FAQ content", error);
      }
    })();
  }, []);

  return (
    <section id="faq-section" className="py-16 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/50 to-background" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-medium mb-3">
            FAQ
          </span>
          <h2 className={`text-2xl md:text-3xl font-bold transition-all duration-700 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Frequently Asked Questions
          </h2>
          <p className={`mt-3 text-sm text-muted-foreground max-w-2xl mx-auto transition-all duration-700 delay-100 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            The answers to all your questions are here
          </p>
        </div>

        <div
          className={`transition-all duration-700 delay-200 transform ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <Tabs value={activeTab || undefined} onValueChange={setActiveTab}>
            <div className="mb-8 overflow-x-auto hide-scrollbar">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 space-x-6">
                {categories.map((category) => {
                  const Icon = getIcon(category.icon_name);
                  return (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="relative py-3 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{category.label}</span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <Accordion type="single" collapsible className="space-y-3">
                  {questions
                    .filter((q) => q.category_id === category.id)
                    .map((faq, index) => (
                      <AccordionItem
                        key={faq.id ?? index}
                        value={`item-${index}`}
                        className="border border-border/40 bg-card rounded-lg overflow-hidden shadow-sm"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                          <div className="flex items-center gap-2 text-left">
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
                              {faq.question}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-3 text-muted-foreground text-xs leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}
