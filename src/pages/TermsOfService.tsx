import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const TermsOfService = () => {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">TERMS OF SERVICE</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 6, 2026</p>

          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Klyc, Inc. ("Klyc," "we," "us," or "our"), a Delaware corporation. These Terms govern your access to and use of the Klyc website, applications, software, AI agents, creator marketplace, and related services (collectively, the "Services").
          </p>

          <p className="font-semibold">
            BY ACCESSING OR USING THE SERVICES, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE SERVICES.
          </p>

          <h2>1. Eligibility and Authority</h2>
          <p>
            To access or use the Services, you must be at least 18 years of age and possess the legal capacity to enter into a binding contract. If you are using the Services on behalf of a business or entity, you represent and warrant that you have the authority to bind that entity to these Terms.
          </p>

          <h2>2. Description of Services</h2>
          <p>Klyc provides an AI-powered marketing ecosystem, including but not limited to:</p>
          <ul>
            <li>AI-driven marketing strategy and content generation.</li>
            <li>Automated video production, transcription, and creative workflows.</li>
            <li>Marketplace functionality connecting users with independent creators ("Creators").</li>
            <li>Analytics and distribution tools.</li>
          </ul>
          <p>
            <strong>Trial/Beta Nature:</strong> You acknowledge that the Services may be in a testing or "Beta" phase. Klyc does not guarantee specific business outcomes, revenue growth, or audience engagement results.
          </p>

          <h2>3. Account Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary. Klyc is not liable for any loss or damage arising from your failure to protect your account.
          </p>

          <h2>4. Acceptable Use Policy</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Services for any illegal, fraudulent, or unauthorized purpose.</li>
            <li>Upload content that is defamatory, obscene, infringing, or otherwise harmful.</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of our AI models or platform.</li>
            <li>Use any "robot," "spider," or automated device to scrape or monitor the Services.</li>
            <li>Circumvent or disable any security-related features of the platform.</li>
          </ul>

          <h2>5. AI-Generated Content & Disclaimers</h2>
          <ul>
            <li><strong>Nature of Output:</strong> The Services utilize artificial intelligence to generate content ("Output"). Due to the nature of machine learning, Output may not be unique across users and may occasionally be inaccurate, biased, or incomplete.</li>
            <li><strong>User Responsibility:</strong> You are solely responsible for reviewing, validating, and editing any Output before use. Klyc provides no warranty regarding the accuracy or reliability of AI-generated content.</li>
            <li><strong>No Professional Advice:</strong> Outputs are for informational and marketing purposes and do not constitute legal, financial, or professional advice.</li>
          </ul>

          <h2>6. Creator Marketplace</h2>
          <p>Klyc facilitates connections between Users and independent Creators.</p>
          <ul>
            <li><strong>Independent Contractor Status:</strong> Creators are independent contractors and are not employees, partners, or agents of Klyc.</li>
            <li><strong>Direct Engagement:</strong> Any agreement for services is strictly between the User and the Creator. Klyc is not a party to those agreements and disclaims all liability for the quality, timing, or legality of Creator deliverables.</li>
          </ul>

          <h2>7. Intellectual Property Rights</h2>
          <ul>
            <li><strong>Klyc IP:</strong> Klyc retains all right, title, and interest in the Services, including proprietary algorithms, AI models, software, branding, and "look and feel."</li>
            <li><strong>User Content:</strong> You retain ownership of the data and content you upload to the platform ("User Content").</li>
            <li><strong>License to Klyc:</strong> You grant Klyc a non-exclusive, worldwide, royalty-free license to host, store, use, and process your User Content solely to provide, maintain, and improve our Services (including training our internal models, subject to our Privacy Policy).</li>
          </ul>

          <h2>8. Fees and Payment</h2>
          <ul>
            <li><strong>Billing:</strong> You agree to pay all fees associated with your selected plan. All fees are non-refundable except as required by law.</li>
            <li><strong>Subscriptions:</strong> Subscriptions automatically renew at the end of each billing cycle unless canceled through your account settings prior to the renewal date.</li>
            <li><strong>Modifications:</strong> Klyc reserves the right to change its fee structure with thirty (30) days' notice.</li>
          </ul>

          <h2>9. Limitation of Liability</h2>
          <p className="uppercase">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL KLYC, INC. BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.
          </p>
          <p>
            Klyc's total aggregate liability for any claim arising out of these Terms shall not exceed the greater of $100 or the amount you paid Klyc in the twelve (12) months preceding the event giving rise to the claim.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Klyc and its officers, directors, and employees from and against any claims, liabilities, damages, or expenses (including legal fees) arising from your use of the Services, your User Content, or your violation of these Terms.
          </p>

          <h2>11. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the Services at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or Klyc's business interests.
          </p>

          <h2>12. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware. Any dispute arising from these Terms shall be resolved through binding arbitration in Delaware, on an individual basis, and you waive your right to a jury trial or to participate in a class-action lawsuit.
          </p>

          <h2>13. Modifications to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by posting the new Terms on the platform. Your continued use of the Services after such changes constitutes acceptance of the new Terms.
          </p>

          <h2>14. Contact Information</h2>
          <p>
            For legal inquiries or notices, please contact: Klyc, Inc. Legal Dept
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
