"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ArrowLeft,
  TrendingUp,
  Calendar,
  MapPin,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

interface SavingsEntry {
  id: string;
  placeName: string;
  location: string;
  amount: number;
  date: string;
  discount: string;
}

export default function SavingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const savingsHistory: SavingsEntry[] = [
    {
      id: "1",
      placeName: "Hagia Sophia Museum",
      location: "Sultanahmet",
      amount: 25.50,
      date: "2024-01-15",
      discount: "20% off entry"
    },
    {
      id: "2",
      placeName: "Topkapi Palace",
      location: "Sultanahmet",
      amount: 30.00,
      date: "2024-01-14",
      discount: "15% off entry"
    },
    {
      id: "3",
      placeName: "Grand Bazaar Restaurant",
      location: "Beyazıt",
      amount: 45.00,
      date: "2024-01-13",
      discount: "30% off meal"
    },
    {
      id: "4",
      placeName: "Bosphorus Cruise",
      location: "Eminönü",
      amount: 50.00,
      date: "2024-01-12",
      discount: "25% off ticket"
    },
    {
      id: "5",
      placeName: "Turkish Bath Experience",
      location: "Taksim",
      amount: 40.00,
      date: "2024-01-10",
      discount: "20% off service"
    },
    {
      id: "6",
      placeName: "Galata Tower",
      location: "Galata",
      amount: 20.00,
      date: "2024-01-09",
      discount: "15% off entry"
    }
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data.session;
        if (session?.user) {
          setIsAuthed(true);
        } else {
          router.replace("/login?redirect=/savings");
        }
      } finally {
        if (mounted) setIsChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (isChecking || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalSavings = savingsHistory.reduce((sum, entry) => sum + entry.amount, 0);
  const averageSaving = totalSavings / savingsHistory.length;
  const thisMonthSavings = savingsHistory
    .filter(entry => new Date(entry.date).getMonth() === new Date().getMonth())
    .reduce((sum, entry) => sum + entry.amount, 0);

  const stats = [
    {
      label: "Total Savings",
      value: `$${totalSavings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      label: "This Month",
      value: `$${thisMonthSavings.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      label: "Average Per Visit",
      value: `$${averageSaving.toFixed(2)}`,
      icon: CheckCircle,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Savings</h1>
            <p className="text-muted-foreground">Track how much you&apos;ve saved with TuristPass</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Savings History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savingsHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">{entry.placeName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{entry.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                      {entry.discount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-2xl font-bold text-green-600">
                      ${entry.amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">saved</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-3">
            <TrendingUp className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Save Even More!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upgrade to our premium passes and unlock even bigger discounts at 70+ locations across Istanbul
            </p>
            <Button asChild size="lg">
              <Link href="/#passes-section">
                Explore Passes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
