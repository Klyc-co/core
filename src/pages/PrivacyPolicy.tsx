import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-foreground mb-2">PRIVACY POLICY</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 6, 2026</p>

          <p>
            Klyc, Inc. ("Klyc," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and services (collectively, the "Services").
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us, as well as information generated automatically through your use of the Services.
          </p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, password, company name, and professional profiles (e.g., LinkedIn or social media handles).</li>
            <li><strong>User Content:</strong> Text, images, videos, audio, and other materials you upload or provide to our AI tools for processing.</li>
            <li><strong>Payment Data:</strong> While we do not store credit card numbers (we use third-party processors like Stripe), we collect billing addresses and transaction history.</li>
            <li><strong>Usage Data:</strong> IP addresses, browser type, device identifiers, and details on how you interact with our AI agents and marketplace.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the collected data to:</p>
          <ul>
            <li><strong>Provide the Services:</strong> Including AI content generation, transcription, and marketplace matching.</li>
            <li><strong>Improve AI Models:</strong> We may use anonymized or de-identified User Content to train and refine our proprietary algorithms and AI models.</li>
            <li><strong>Communication:</strong> To send product updates, security alerts, and support messages.</li>
            <li><strong>Analytics:</strong> To monitor platform performance and user trends to optimize the user experience.</li>
          </ul>

          <h2>3. Sharing of Information</h2>
          <p>
            We do not sell your personal information. We may share your data only in the following circumstances:
          </p>
          <ul>
            <li><strong>With Service Providers:</strong> Third-party vendors who provide cloud hosting (e.g., AWS/Google Cloud), payment processing, and customer support tools.</li>
            <li><strong>Marketplace Interactions:</strong> If you are a User engaging a Creator, we share necessary contact info to facilitate the engagement.</li>
          </ul>

          <h2>4. AI Training and Data Security</h2>
          <p>Klyc takes the security of your content seriously.</p>
          <ul>
            <li><strong>Data Minimization:</strong> We strive to collect only the data necessary to provide our AI-driven features.</li>
            <li><strong>Security Measures:</strong> We implement industry-standard encryption (SSL/TLS) and administrative safeguards to protect your data.</li>
            <li><strong>Model Training Opt-Out:</strong> If you wish to opt-out of having your User Content used for model training, please contact privacy@klyc.ai.</li>
          </ul>

          <h2>5. Your Rights and Choices</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Request that we delete your personal data (subject to legal or contractual obligations).</li>
            <li><strong>Marketing Preferences:</strong> Opt-out of promotional emails at any time.</li>
          </ul>

          <h2>6. Third-Party Integrations</h2>
          <p>
            Our Services integrate with third-party platforms (e.g., YouTube, TikTok, Google). Klyc is not responsible for the privacy practices of these third parties. We recommend reviewing the privacy policies of any platform you link to your Klyc account.
          </p>

          <h2>7. International Data Transfers</h2>
          <p>
            Klyc is based in the United States. By using our Services, you consent to the transfer and processing of your information in the U.S., where data protection laws may differ from those in your home jurisdiction.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            Klyc is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete it immediately.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically to reflect changes in our practices or for legal reasons. We will notify you of any material changes by updating the "Last Updated" date at the top of this policy.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at:
          </p>
          <p>
            Klyc, Inc. Attn: Privacy Department
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
