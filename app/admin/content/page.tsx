import AdminFAQ from "@/components/admin/content/AdminFAQ";
import AdminHowItWorks from "@/components/admin/content/AdminHowItWorks";
import AdminWhyChooseUs from "@/components/admin/content/AdminWhyChooseUs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";

export default function ContentPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-sm text-muted-foreground">Edit FAQ, How It Works, and Why Choose Us sections shown on the homepage.</p>
        </div>
        <Tabs defaultValue="faq" className="space-y-4">
          <TabsList>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="how">How It Works</TabsTrigger>
            <TabsTrigger value="why">Why Choose Us</TabsTrigger>
          </TabsList>
          <TabsContent value="faq">
            <AdminFAQ />
          </TabsContent>
          <TabsContent value="how">
            <AdminHowItWorks />
          </TabsContent>
          <TabsContent value="why">
            <AdminWhyChooseUs />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
