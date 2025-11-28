"use client";

import { useState } from "react";
import { useBusinessContext } from "./BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Key,
  CheckCircle,
  XCircle,
  Scan,
  Clock,
  User,
  Percent,
  Receipt,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

type ValidationResult = {
  success: boolean;
  valid?: boolean;
  message?: string;
  pass?: {
    id: string;
    passName: string | null;
    customerId: string | null;
    expiryDate: string | null;
    usageCount: number | null;
    maxUsage: number | null;
    discountApplied?: {
      percentage: number | null;
      originalAmount: number | null;
      discountedAmount: number | null;
      savings: number | null;
    };
  };
  campaign?: {
    id: string;
    title: string;
    campaignType: string;
    discountType: string;
    discountValue: number;
    discountApplied: {
      percentage: number;
      originalAmount: number | null;
      discountedAmount: number | null;
      savings: number;
    };
  };
};

export default function BusinessScanner() {
  const { loading } = useBusinessContext();
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationType, setValidationType] = useState<"qr_code" | "pin_code" | "promo_code">("qr_code");
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim()) {
      toast.error("Please enter a QR or PIN code");
      return;
    }

    try {
      setIsValidating(true);
      setResult(null);
      const payload = {
        identifier: identifier.trim(),
        validationType,
        notes: notes.trim() || undefined,
        originalAmount: amount ? Number(amount) : undefined,
      };

      const response = await fetch("/api/business/validate-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ValidationResult = await response.json();
      if (!response.ok || !data.success || data.valid === false) {
        setResult(data);
        toast.error(data.message ?? "Validation failed");
        return;
      }

      setResult(data);
      toast.success(data.message ?? "Pass validated successfully");
      setIdentifier("");
      setAmount("");
      setNotes("");
    } catch (error: any) {
      console.error("Validation error", error);
      toast.error(error.message ?? "Failed to validate pass");
    } finally {
      setIsValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Pass Scanner</h2>
        <p className="text-muted-foreground">
          Validate customer passes via QR or PIN and record applied discounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validate Customer Pass</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the customer&apos;s TuristPass QR code or PIN code to validate and apply the
            active offer.
          </p>
        </CardHeader>

        <CardContent>
          <Tabs
            value={validationType}
            onValueChange={(value) => setValidationType(value as "qr_code" | "pin_code" | "promo_code")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr_code">
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="pin_code">
                <Key className="h-4 w-4 mr-2" />
                PIN Code
              </TabsTrigger>
              <TabsTrigger value="promo_code">
                <Tag className="h-4 w-4 mr-2" />
                Promo Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr_code" className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border border-dashed flex flex-col items-center gap-4">
                <QrCode className="h-16 w-16 text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  Enter the QR string displayed in the customer&apos;s TuristPass app.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pin_code" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Customers can display their 6 digit PIN if scanning unavailable.
              </p>
            </TabsContent>

            <TabsContent value="promo_code" className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200 flex flex-col items-center gap-4">
                <Tag className="h-16 w-16 text-orange-600" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-orange-900 mb-1">
                    Campaign Promo Code
                  </p>
                  <p className="text-xs text-orange-700">
                    Enter the promo code from your active campaigns
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <form onSubmit={handleValidate} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {validationType === "promo_code" ? "Promo Code" : "QR / PIN Code"}
              </label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  validationType === "pin_code"
                    ? "e.g., TP1234AB"
                    : validationType === "promo_code"
                    ? "e.g., SUMMER20"
                    : "Scan code value"
                }
                className="font-mono uppercase"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Purchase Amount (₺)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 250"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note for your records"
              />
            </div>

            <Button type="submit" disabled={isValidating || !identifier.trim()} className="w-full">
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Validate Pass
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success && result.valid ? "border-green-500" : "border-red-500"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div
                className={`p-2 rounded-full ${
                  result.success && result.valid
                    ? "bg-green-100 dark:bg-green-900"
                    : "bg-red-100 dark:bg-red-900"
                }`}
              >
                {result.success && result.valid ? (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3
                    className={`font-semibold ${
                      result.success && result.valid
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {result.message ?? (result.valid ? "Pass validated successfully" : "Validation failed")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleString()}
                  </p>
                </div>

                {result.campaign && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3 mb-3">
                      <Tag className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-900">{result.campaign.title}</h4>
                        <p className="text-xs text-orange-700 capitalize">
                          {result.campaign.campaignType.replace('_', ' ')} • {result.campaign.discountType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">Discount: {result.campaign.discountApplied.percentage.toFixed(1)}%</span>
                        </p>
                        {result.campaign.discountApplied.originalAmount && (
                          <p className="text-orange-700">
                            Original: ₺{result.campaign.discountApplied.originalAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        {result.campaign.discountApplied.discountedAmount !== null && (
                          <p className="font-semibold text-green-700">
                            Final: ₺{result.campaign.discountApplied.discountedAmount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-green-700">
                          Saved: ₺{result.campaign.discountApplied.savings.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.pass && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{result.pass.passName ?? "TuristPass"}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Usage: {result.pass.usageCount ?? 0} /{" "}
                        {result.pass.maxUsage ?? "Unlimited"}
                      </p>
                      {result.pass.expiryDate && (
                        <p className="text-muted-foreground">
                          Expires: {new Date(result.pass.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>Customer ID: {result.pass.customerId ?? "N/A"}</p>
                      {result.pass.discountApplied && (
                        <>
                          <p>
                            Discount: {result.pass.discountApplied.percentage ?? 0}%
                          </p>
                          {result.pass.discountApplied.originalAmount !== null && (
                            <p>
                              ₺{result.pass.discountApplied.discountedAmount?.toFixed(2)} billed
                              (saved ₺
                              {(result.pass.discountApplied.savings ?? 0).toFixed(2)})
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Tip</h3>
              <p className="text-sm text-muted-foreground">
                Encourage customers to show their TuristPass QR code. If the QR cannot be scanned,
                use the PIN fallback option.
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              Real-time validation
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
