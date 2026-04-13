import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";

export default function KlycAdminChannels() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Channels</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Channel Management</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Channel configuration and monitoring coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
