"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, Star, Clock, Ticket, Calendar } from "lucide-react";
import Image from "next/image";
import PromoBanner from "@/components/PromoBanner";

const features = [
  { icon: Compass, text: "40+ Popular Places" },
  { icon: Star, text: "Special Benefits" },
  { icon: Clock, text: "24/7 Valid" },
  { icon: Ticket, text: "Skip The Lines" },
  { icon: Calendar, text: "3 Month Validity" }
];

const stats = [
  { value: "50K+", label: "Happy Users" },
  { value: "4.8/5", label: "User Rating" },
  { value: "40+", label: "Premium Venues" },
  { value: "35%", label: "Average Savings" }
];

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
                  The Smartest Way <br />
                  <span className="text-primary relative inline-block">
                    To Explore
                     {/*<svg className="absolute left-0 w-full" viewBox="0 0 200 10" fill="none">
                      <path d="M0,5 C50,5 50,-2 100,5 C150,-2 150,5 200,5" 
                            stroke="currentColor" strokeWidth="2" 
                            className="text-primary animate-draw" pathLength="1" 
                            strokeDasharray="1" strokeDashoffset="1" />
                    </svg>*/}
                  </span>
                </h1>

                {/* Description */}
                <p className={`text-base md:text-lg text-muted-foreground mt-4 transition-all duration-1000 delay-200 text-black
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  Unlimited access to the city&apos;s most popular attractions and special advantages with a single digital pass
                </p>

                {/* Stats */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 mb-6 transition-all duration-1000 delay-300
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {stats.map((stat, index) => (
                    <div key={index} className="flex flex-col items-center md:items-start">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{stat.value}</span>
                      <span className="text-xs md:text-sm text-muted-foreground text-black">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className={`flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 transition-all duration-1000 delay-400
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                  {features.map((feature, index) => (
                    <div key={index} 
                        className="flex items-center gap-1 md:gap-2 text-xs md:text-sm bg-primary/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                      <feature.icon className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div className={`flex flex-col sm:flex-row items-center md:justify-start justify-center gap-3 md:gap-4 transition-all duration-1000 delay-500 mt-6
  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
  
  <Button 
    size="lg" 
    className="w-full sm:w-auto bg-primary hover:bg-primary/90"
    onClick={() => {
      document.getElementById('passes-section')?.scrollIntoView({ behavior: 'smooth' });
    }}
  >
    <span>Buy Pass Now</span>
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