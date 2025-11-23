"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  banner_text: string;
  banner_type: string;
  discount_type?: string;
  discount_value?: number;
  end_date: string;
}

export default function PromoBanner() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  useEffect(() => {
    fetchActiveCampaign();
  }, []);

  useEffect(() => {
    // Check if banner was dismissed for this campaign
    if (campaign) {
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '{}');
      if (dismissedBanners[campaign.id]) {
        setIsBannerVisible(false);
      }
    }
  }, [campaign]);

  const fetchActiveCampaign = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/campaigns/active");
      const data = await response.json();

      if (data.campaign) {
        setCampaign(data.campaign);
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseBanner = () => {
    if (campaign) {
      // Save to localStorage that this banner was dismissed
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '{}');
      dismissedBanners[campaign.id] = true;
      localStorage.setItem('dismissedBanners', JSON.stringify(dismissedBanners));
    }
    setIsBannerVisible(false);
  };

  // Don't render if no campaign or banner is hidden
  if (isLoading || !campaign || !isBannerVisible) {
    return null;
  }

  const bannerColorClass = {
    info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200",
    success: "bg-green-50 dark:bg-green-950/30 border-green-200",
    promotion: "bg-accent border-accent-foreground/10",
  }[campaign.banner_type] || "bg-accent border-accent-foreground/10";

  const iconColorClass = {
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-amber-600 dark:text-amber-400",
    success: "text-green-600 dark:text-green-400",
    promotion: "text-primary",
  }[campaign.banner_type] || "text-primary";

  return (
    <>
      <div className={`relative w-full ${bannerColorClass} py-3 md:py-4 border-b z-10 overflow-hidden`}>
        <div className="absolute inset-0 bg-primary/5 animate-pulse-slow pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-3 relative z-10">
          {/* Empty div for layout */}
          <div className="hidden sm:block w-24" />

          {/* Centered promotional text */}
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center justify-center mx-auto hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <ShoppingBag className={`h-5 w-5 ${iconColorClass} mr-2 animate-pulse-slow`} />
            <p className="text-sm md:text-base font-medium">
              {campaign.banner_text}
            </p>
          </button>

          {/* View details button on the right */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-1 text-primary font-medium text-sm md:text-base whitespace-nowrap hover:bg-transparent"
            >
              View Details
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseBanner}
              className="h-8 w-8"
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{campaign.title}</DialogTitle>
            {campaign.subtitle && (
              <DialogDescription className="text-lg font-medium">
                {campaign.subtitle}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {campaign.description && (
              <p className="text-muted-foreground">{campaign.description}</p>
            )}

            {campaign.discount_type && campaign.discount_type !== "none" && (
              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {campaign.discount_type === "percentage"
                        ? `${campaign.discount_value}% OFF`
                        : `₺${campaign.discount_value} OFF`}
                    </p>
                    <p className="text-sm text-muted-foreground">Special Discount</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-primary" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Valid until:</span>
              <span className="font-medium">
                {new Date(campaign.end_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setShowDialog(false);
                  document.getElementById("passes-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Browse Passes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
