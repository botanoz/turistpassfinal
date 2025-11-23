"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ticket,
  QrCode,
  Key,
  Calendar,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { authService } from "@/lib/services/authService";
import type { User as LocalUser } from "@/lib/types/user";

export default function MyPassesPage() {
  const mapLocalPasses = (user: LocalUser) => {
    return (user.passes || []).map(pass => ({
      id: pass.id,
      passId: pass.id,
      passName: pass.name,
      passType: "local",
      activationCode: `LOCAL-${pass.id}`,
      pinCode: "000000",
      expiryDate: pass.expiryDate,
      status: pass.status,
      purchasedAt: user.joinedDate,
      order: null
    }));
  };

  const router = useRouter();
  const [passes, setPasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPasses() {
      try {
        setIsLoading(true);
        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
        const response = await fetch('/api/customer/passes');
        const result = await response.json();

        if (response.status === 401) {
          if (localUser) {
            setPasses(mapLocalPasses(localUser));
            return;
          }
          router.push("/login?redirect=/my-passes");
          return;
        }

        if (!result.success) {
          if (localUser) {
            setPasses(mapLocalPasses(localUser));
            return;
          }
          throw new Error(result.error || 'Failed to load passes');
        }

        setPasses(result.passes || []);
      } catch (err: any) {
        console.error('Error loading passes:', err);
        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
        if (localUser) {
          setPasses(mapLocalPasses(localUser));
        } else {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadPasses();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const generateQRCode = (activationCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activationCode}`;
  };

  const activePasses = passes.filter(p => p.status === "active");
  const expiredPasses = passes.filter(p => p.status === "expired");

  const PassCard = ({ pass }: { pass: any }) => {
    const isExpired = pass.status === "expired";
    const qrCodeUrl = generateQRCode(pass.activationCode);
    const pin = pass.pinCode;

    return (
      <Card className={`${isExpired ? 'opacity-60' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{pass.passName}</CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Expires: {new Date(pass.expiryDate).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired ? (
                <><XCircle className="h-3 w-3 mr-1" /> Expired</>
              ) : (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
              )}
            </Badge>
          </div>
        </CardHeader>

        {!isExpired && (
          <CardContent className="space-y-4">
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </TabsTrigger>
                <TabsTrigger value="pin">
                  <Key className="h-4 w-4 mr-2" />
                  PIN Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${pass.passName}`}
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Show this QR code at the venue entrance
                </p>
              </TabsContent>

              <TabsContent value="pin" className="space-y-3">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your PIN Code</p>
                    <p className="text-3xl font-bold tracking-wider font-mono text-primary">
                      {pin}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Use this PIN if QR code cannot be scanned
                </p>
              </TabsContent>
            </Tabs>

            <Button className="w-full" variant="outline" asChild>
              <Link href="/places">
                <MapPin className="h-4 w-4 mr-2" />
                View Partner Locations
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Passes</h1>
            <p className="text-muted-foreground">Manage and use your active passes</p>
          </div>
        </div>

        {activePasses.length === 0 && expiredPasses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Passes Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring Istanbul with our exclusive passes
              </p>
              <Button asChild>
                <Link href="/#passes-section">
                  Browse Passes
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {activePasses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Active Passes ({activePasses.length})</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {activePasses.map((pass) => (
                    <PassCard key={pass.id} pass={pass} />
                  ))}
                </div>
              </div>
            )}

            {expiredPasses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-muted-foreground">
                    Expired Passes ({expiredPasses.length})
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {expiredPasses.map((pass) => (
                    <PassCard key={pass.id} pass={pass} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
