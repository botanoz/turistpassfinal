"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, ArrowRight, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  banner_text: string;
  banner_type: string;
  discount_type?: string;
  discount_value?: number;
  discount_code?: string;
  end_date: string;
}

export default function PromoBanner() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

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

  const copyDiscountCode = async () => {
    if (campaign?.discount_code) {
      try {
        await navigator.clipboard.writeText(campaign.discount_code);
        setCodeCopied(true);
        toast.success('Discount code copied!');
        setTimeout(() => setCodeCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy code');
      }
    }
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

          {/* Centered promotional text with discount code */}
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center justify-center mx-auto hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <ShoppingBag className={`h-5 w-5 ${iconColorClass} mr-2 animate-pulse-slow`} />
            <div className="flex items-center gap-2">
              <p className="text-sm md:text-base font-medium">
                {campaign.banner_text}
              </p>
              {campaign.discount_code && (
                <span className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs md:text-sm font-mono font-bold tracking-wider shadow-sm border-2 border-primary/20 animate-pulse-slow">
                  {campaign.discount_code}
                </span>
              )}
            </div>
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

            {/* Discount Code Section */}
            {campaign.discount_code && (
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-5 rounded-lg border-2 border-primary/30 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Discount Code</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 px-4 py-3 rounded-md border-2 border-dashed border-primary/40">
                      <p className="text-3xl font-mono font-bold tracking-widest text-center text-primary">
                        {campaign.discount_code}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={copyDiscountCode}
                    className="h-12 w-12 bg-primary hover:bg-primary/90"
                  >
                    {codeCopied ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Copy className="h-6 w-6" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {codeCopied ? '✓ Code copied to clipboard!' : 'Click the copy icon to use this code at checkout'}
                </p>
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
