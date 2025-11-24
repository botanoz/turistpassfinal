"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";
import Image from "next/image";
import PromoBanner from "@/components/PromoBanner";

interface HeroSettings {
  title: string;
  subtitle: string;
  description: string;
  stats: Array<{ value: string; label: string }>;
  features: Array<{ icon: string; text: string }>;
  ctaText: string;
  ctaUrl: string;
}

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [heroData, setHeroData] = useState<HeroSettings>({
    title: "The Smartest Way",
    subtitle: "To Explore",
    description: "Unlimited access to the city's most popular attractions and special advantages with a single digital pass",
    stats: [
      { value: "50K+", label: "Happy Users" },
      { value: "4.8/5", label: "User Rating" },
      { value: "40+", label: "Premium Venues" },
      { value: "35%", label: "Average Savings" }
    ],
    features: [
      { icon: "Compass", text: "40+ Popular Places" },
      { icon: "Star", text: "Special Benefits" },
      { icon: "Clock", text: "24/7 Valid" },
      { icon: "Ticket", text: "Skip The Lines" },
      { icon: "Calendar", text: "3 Month Validity" }
    ],
    ctaText: "Buy Pass Now",
    ctaUrl: "#passes-section"
  });

  useEffect(() => {
    setIsVisible(true);

    // Fetch hero settings from API
    const fetchHeroSettings = async () => {
      try {
        const response = await fetch('/api/settings/public');
        if (response.ok) {
          const settings = await response.json();

          // Parse hero settings from flat structure
          const newHeroData: HeroSettings = {
            title: settings.hero_title || heroData.title,
            subtitle: settings.hero_subtitle || heroData.subtitle,
            description: settings.hero_description || heroData.description,
            stats: [
              { value: settings.hero_stat1_value || heroData.stats[0].value, label: settings.hero_stat1_label || heroData.stats[0].label },
              { value: settings.hero_stat2_value || heroData.stats[1].value, label: settings.hero_stat2_label || heroData.stats[1].label },
              { value: settings.hero_stat3_value || heroData.stats[2].value, label: settings.hero_stat3_label || heroData.stats[2].label },
              { value: settings.hero_stat4_value || heroData.stats[3].value, label: settings.hero_stat4_label || heroData.stats[3].label }
            ],
            features: [
              { icon: settings.hero_feature1_icon || heroData.features[0].icon, text: settings.hero_feature1_text || heroData.features[0].text },
              { icon: settings.hero_feature2_icon || heroData.features[1].icon, text: settings.hero_feature2_text || heroData.features[1].text },
              { icon: settings.hero_feature3_icon || heroData.features[2].icon, text: settings.hero_feature3_text || heroData.features[2].text },
              { icon: settings.hero_feature4_icon || heroData.features[3].icon, text: settings.hero_feature4_text || heroData.features[3].text },
              { icon: settings.hero_feature5_icon || heroData.features[4].icon, text: settings.hero_feature5_text || heroData.features[4].text }
            ],
            ctaText: settings.hero_cta_text || heroData.ctaText,
            ctaUrl: settings.hero_cta_url || heroData.ctaUrl
          };

          setHeroData(newHeroData);
        }
      } catch (error) {
        console.error('Failed to fetch hero settings:', error);
        // Use default values on error
      }
    };

    fetchHeroSettings();
  }, []);

  // Helper function to get icon component from string name
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Compass; // Fallback to Compass
  };

  const handleCTAClick = () => {
    if (heroData.ctaUrl.startsWith('#')) {
      // Scroll to anchor
      const element = document.getElementById(heroData.ctaUrl.substring(1));
      element?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navigate to URL
      window.location.href = heroData.ctaUrl;
    }
  };

  return (
    <>
      <PromoBanner />
      <div className="relative min-h-[70vh] md:min-h-[60vh] flex items-center overflow-hidden bg-background">
        {/* Background Image without blur */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/img/hero.jpg"
            alt="Istanbul Cityscape"
            fill
            className="object-cover object-center"
            priority
          />
          {/* No overlay or blur */}
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              {/* Content Box with Background - As shown in red outline */}
              <div className="bg-background/70 p-6 md:p-8 rounded-lg max-w-xl mx-auto md:mx-0 backdrop-blur-sm">
                {/* Title */}
                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight transition-all duration-1000 transform
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {heroData.title} <br />
                  <span className="text-primary relative inline-block">
                    {heroData.subtitle}
                  </span>
                </h1>

                {/* Description */}
                <p className={`text-base md:text-lg text-muted-foreground mt-4 transition-all duration-1000 delay-200 text-black
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {heroData.description}
                </p>

                {/* Stats */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 mb-6 transition-all duration-1000 delay-300
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {heroData.stats.map((stat, index) => (
                    <div key={index} className="flex flex-col items-center md:items-start">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{stat.value}</span>
                      <span className="text-xs md:text-sm text-muted-foreground text-black">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className={`flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 transition-all duration-1000 delay-400
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {heroData.features.map((feature, index) => {
                    const IconComponent = getIconComponent(feature.icon);
                    return (
                      <div key={index}
                          className="flex items-center gap-1 md:gap-2 text-xs md:text-sm bg-primary/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                        <IconComponent className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                        <span>{feature.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Buttons */}
                <div className={`flex flex-col sm:flex-row items-center md:justify-start justify-center gap-3 md:gap-4 transition-all duration-1000 delay-500 mt-6
  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

  <Button
    size="lg"
    className="w-full sm:w-auto bg-primary hover:bg-primary/90"
    onClick={handleCTAClick}
  >
    <span>{heroData.ctaText}</span>
    <ArrowRight className="ml-2 h-4 w-4" />
  </Button>

</div>
              </div>
            </div>

            {/* Right side - intentionally left empty, no background applied */}
            <div className="hidden md:block"></div>
          </div>
        </div>
      </div>
    </>
  );
}
