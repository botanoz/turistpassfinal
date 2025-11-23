"use client";

import { useState, useEffect, useRef } from "react";
import {
  BadgePercent,
  HeartHandshake,
  Map,
  CreditCard,
  Store,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import { fetchWhyChooseContent, type WhyBenefit, type WhyFeature } from "@/lib/services/contentService";

const iconMap: Record<string, any> = {
  BadgePercent,
  HeartHandshake,
  Map,
  CreditCard,
  Store,
  ShoppingBag,
};

const getIcon = (name: string) => iconMap[name] || BadgePercent;

export default function WhyIstanbulPass() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [benefits, setBenefits] = useState<WhyBenefit[]>([]);
  const [features, setFeatures] = useState<WhyFeature[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current && observerRef.current) {
      observerRef.current.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current && observerRef.current) {
        observerRef.current.unobserve(sectionRef.current);
      }
    };
  }, [isMounted]);

  useEffect(() => {
    (async () => {
      try {
        const { benefits, features } = await fetchWhyChooseContent();
        setBenefits(benefits);
        setFeatures(features);
      } catch (error) {
        console.error("Failed to load Why Choose content", error);
      }
    })();
  }, []);

  const fallbackFeatures: string[] = [
    "Exclusive discounts at 70+ locations across Istanbul",
    "Save up to 20% at restaurants, cafés, and shops",
    "Valid for 1, 3, or 7 days – you choose!",
    "Instant digital delivery to your email",
    "No reservations needed – just show and save",
    "Track all your savings in one place",
  ];

  const fallbackBenefits: WhyBenefit[] = [
    { id: "1", title: "Exclusive Discounts", description: "Up to 20% off at 70+ locations across Istanbul", icon_name: "BadgePercent", color_gradient: "from-blue-500/80 to-blue-600/80", display_order: 1 },
    { id: "2", title: "Authentic Experience", description: "Discover hand-picked local eateries and unique shopping venues", icon_name: "Map", color_gradient: "from-amber-500/80 to-amber-600/80", display_order: 2 },
    { id: "3", title: "One Pass, Endless Savings", description: "Best deals for both food and shopping in one convenient pass", icon_name: "CreditCard", color_gradient: "from-green-500/80 to-green-600/80", display_order: 3 },
    { id: "4", title: "Perfect for Every Traveler", description: "Experience Istanbul like a local while saving money", icon_name: "Store", color_gradient: "from-purple-500/80 to-purple-600/80", display_order: 4 },
    { id: "5", title: "Easy & Contactless", description: "Scan your pass and enjoy instant discounts—no hassle, no fees", icon_name: "ShoppingBag", color_gradient: "from-pink-500/80 to-pink-600/80", display_order: 5 },
    { id: "6", title: "Support Local Businesses", description: "Help small, family-owned restaurants and local artisans", icon_name: "HeartHandshake", color_gradient: "from-teal-500/80 to-teal-600/80", display_order: 6 },
  ];

  const displayBenefits = (benefits.length ? benefits : fallbackBenefits).sort((a, b) => a.display_order - b.display_order);
  const displayFeatures = features.length
    ? [...features].sort((a, b) => a.display_order - b.display_order).map((f) => f.feature_text)
    : fallbackFeatures;

  return (
    <section 
      ref={sectionRef}
      className="py-20 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Hero section with text and image */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 items-center">
          {/* Left side - Text content */}
          <div className={`transition-all duration-700 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="inline-block mb-3 px-4 py-1 bg-primary/10 rounded-full">
              <span className="text-primary font-medium text-sm">Why Choose Us?</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Shopping & Food Pass?
            </h2>
            
            <p className="text-xl font-semibold text-primary mb-8">
              We guarantee you&apos;ll save on your Istanbul adventure!
            </p>

            <div className="space-y-4">
              {displayFeatures.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mr-3 mt-0.5" />
                  <p className="text-base">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Image */}
          <div className={`rounded-xl overflow-hidden shadow-lg transition-all duration-700 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            style={{ transitionDelay: "200ms" }}
          >
            <img 
              src="https://picsum.photos/seed/istanbul/800/600" 
              alt="Istanbul Pass" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Benefits cards in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {displayBenefits.map((benefit, index) => {
            const Icon = getIcon(benefit.icon_name);
            return (
            <div 
              key={benefit.id || index}
              className={`rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform 
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} hover:scale-[1.02]`}
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <div className={`p-4 bg-card h-full border border-border/50 relative group`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color_gradient || ""} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">
                    <div className={`p-3 bg-primary/10 rounded-lg text-primary`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm mb-1">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </section>
  );
}
