"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUp, Check, Sparkles } from "lucide-react";
import Link from "next/link";

interface UpgradePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  from_pass_id: string;
  to_pass_id: string;
  is_active: boolean;
  from_pass: {
    name: string;
  };
  to_pass: {
    name: string;
    description: string;
  };
}

interface UserPass {
  id: string;
  pass_id: string;
  status: string;
  passes: {
    id: string;
    name: string;
    description: string;
  };
}

export default function PassUpgradePage() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPasses, setUserPasses] = useState<UserPass[]>([]);
  const [upgradePackages, setUpgradePackages] = useState<UpgradePackage[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data.session;
        if (session?.user) {
          setIsAuthed(true);
          await loadData();
        } else {
          router.replace("/login?redirect=/my-passes/upgrade");
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user's active passes
      const passesRes = await fetch('/api/customer/passes');
      const passesData = await passesRes.json();
      if (passesData.success) {
        setUserPasses(passesData.passes.filter((p: UserPass) => p.status === 'active'));
      }

      // Load available upgrade packages
      const upgradesRes = await fetch('/api/customer/upgrade-packages');
      const upgradesData = await upgradesRes.json();
      if (upgradesData.success) {
        setUpgradePackages(upgradesData.packages);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    const symbols: Record<string, string> = {
      TRY: '₺',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const handleUpgrade = async (packageId: string) => {
    // Redirect to checkout with upgrade package
    router.push(`/checkout?upgrade=${packageId}`);
  };

  if (isChecking || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/my-passes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Upgrade Your Pass</h1>
            <p className="text-muted-foreground">Unlock more benefits and experiences</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : userPasses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No active passes</h3>
              <p className="text-muted-foreground mb-4">Purchase a pass first to see upgrade options</p>
              <Button asChild>
                <Link href="/#passes-section">Explore Passes</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Current Passes */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Active Passes</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userPasses.map((userPass) => (
                  <Card key={userPass.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        {userPass.passes.name}
                      </CardTitle>
                      <CardDescription>{userPass.passes.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge>Active</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Available Upgrades */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Upgrades</h2>
              {upgradePackages.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ArrowUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No upgrades available</h3>
                    <p className="text-muted-foreground">
                      There are no upgrade packages available for your current passes
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upgradePackages.map((pkg) => {
                    const hasFromPass = userPasses.some(up => up.pass_id === pkg.from_pass_id);

                    return (
                      <Card key={pkg.id} className={!hasFromPass ? "opacity-60" : ""}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{pkg.name}</CardTitle>
                              <CardDescription className="mt-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{pkg.from_pass.name}</span>
                                  <ArrowUp className="h-4 w-4" />
                                  <span className="font-semibold text-foreground">{pkg.to_pass.name}</span>
                                </div>
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold">{formatCurrency(pkg.price, pkg.currency)}</p>
                              <p className="text-xs text-muted-foreground">Upgrade price</p>
                            </div>
                            <Button
                              onClick={() => handleUpgrade(pkg.id)}
                              disabled={!hasFromPass}
                              size="sm"
                            >
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Upgrade
                            </Button>
                          </div>
                          {!hasFromPass && (
                            <p className="text-xs text-orange-600 mt-2">
                              You need {pkg.from_pass.name} to upgrade
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
