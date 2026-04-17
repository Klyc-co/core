import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Shield, Clock } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Data Deletion Request | Klyc</title>
        <meta
          name="description"
          content="Request deletion of your Klyc account and associated data, including data from connected platforms like Meta, Threads, and Instagram."
        />
        <link rel="canonical" href="https://klyc.ai/data-deletion" />
      </Helmet>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Data Deletion Request
          </h1>
          <p className="text-muted-foreground text-lg">
            Klyc respects your right to control your data. You can request deletion
            of your account and all associated data at any time.
          </p>
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              How to request deletion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-foreground/90">
            <p>
              Send an email to{" "}
              <a
                href="mailto:privacy@klyc.ai?subject=Data%20Deletion%20Request"
                className="text-primary font-medium underline underline-offset-4"
              >
                privacy@klyc.ai
              </a>{" "}
              with the subject line <strong>"Data Deletion Request"</strong>.
            </p>
            <p>Please include the following in your email:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>The email address associated with your Klyc account</li>
              <li>
                The connected platforms you'd like data removed from (e.g.,
                Threads, Instagram, Facebook, TikTok)
              </li>
              <li>Any account usernames you used to authorize Klyc</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              What will be deleted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-foreground/90">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Your Klyc account and profile</li>
              <li>OAuth access and refresh tokens for connected platforms</li>
              <li>
                Cached content, analytics, and post history fetched from
                Meta/Threads/Instagram and other connected services
              </li>
              <li>Generated campaigns, drafts, and uploaded brand assets</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground/90">
            <p>
              Deletion requests are processed within{" "}
              <strong>30 days</strong> of receipt. You will receive a
              confirmation email once your data has been removed from our
              systems and connected platform caches.
            </p>
          </CardContent>
        </Card>

        <footer className="mt-10 text-sm text-muted-foreground">
          <p>
            For more information, see our{" "}
            <a href="/privacy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-primary underline underline-offset-4">
              Terms of Service
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
