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
          <h1 className="text-3xl font-bold text-foreground mb-2">KLYC TERMS OF SERVICE</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 6, 2026</p>

          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Klyc, Inc. ("Klyc," "we," "us," or "our"), a Delaware corporation, governing your access to and use of the Klyc website, applications, APIs, AI agents, creator marketplace, integrations, and related services (collectively, the "Services").
          </p>

          <p className="font-semibold">
            BY ACCESSING OR USING THE SERVICES, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE THE SERVICES.
          </p>

          <h2>1. Eligibility and Authority</h2>
          <p>
            You must be at least 18 years old and capable of forming a binding contract. If you use the Services on behalf of an organization, you represent and warrant that you have authority to bind that entity.
          </p>
          <p>You further represent that:</p>
          <ul>
            <li>You are not subject to U.S. sanctions.</li>
            <li>You are not prohibited from using the Services under applicable law.</li>
            <li>Your use will comply with all applicable platform policies and third-party terms.</li>
          </ul>

          <h2>2. Description of Services</h2>
          <p>Klyc provides an AI-powered marketing and content automation ecosystem, including:</p>
          <ul>
            <li>AI-driven content generation and strategy</li>
            <li>Video production and automation tools</li>
            <li>Data analytics and reporting</li>
            <li>Workflow integrations</li>
            <li>Marketplace access to independent Creators</li>
            <li>API integrations with third-party platforms</li>
            <li>Social media publishing and performance tracking tools</li>
          </ul>
          <p>Klyc may update, modify, or discontinue features at any time.</p>

          <h3>Beta Services</h3>
          <p>
            Some features may be labeled "Beta," "Preview," or similar. These are provided "AS IS" and may be incomplete or unstable.
          </p>

          <h2>3. Third-Party Platform Integrations</h2>
          <p>Klyc enables integrations with third-party services, including but not limited to:</p>
          <ul>
            <li>Social media platforms (e.g., Meta, Instagram, TikTok, YouTube, X, LinkedIn)</li>
            <li>Project management tools (e.g., ClickUp, Asana)</li>
            <li>Data platforms (e.g., Airtable)</li>
            <li>Storage providers (e.g., Dropbox)</li>
          </ul>

          <h3>3.1 Compliance With Platform Policies</h3>
          <p>You agree that your use of the Services in connection with any third-party platform will comply with:</p>
          <ul>
            <li>The applicable platform's Terms of Service</li>
            <li>Developer policies</li>
            <li>API usage rules</li>
            <li>Community guidelines</li>
            <li>Advertising policies</li>
          </ul>
          <p>Klyc does not control third-party platforms and is not responsible for their policies, restrictions, outages, or enforcement decisions.</p>

          <h3>3.2 Authorized Access Only</h3>
          <p>You may only connect accounts you lawfully control and are authorized to access.</p>
          <p>You represent and warrant that:</p>
          <ul>
            <li>You have permission to access and manage any connected account.</li>
            <li>You have authority to publish content through connected accounts.</li>
          </ul>

          <h3>3.3 API Data Use</h3>
          <p>Data retrieved from third-party APIs is used solely:</p>
          <ul>
            <li>To provide Services requested by you</li>
            <li>To display analytics</li>
            <li>To improve product performance</li>
            <li>To operate requested automations</li>
          </ul>
          <p>Klyc does not sell raw third-party API data.</p>

          <h2>4. User Accounts and Security</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining confidentiality of credentials</li>
            <li>Securing API tokens and integration keys</li>
            <li>All activity under your account</li>
          </ul>
          <p>You must notify us immediately of any unauthorized use.</p>
          <p>Klyc may suspend access if security risk is suspected.</p>

          <h2>5. Acceptable Use</h2>
          <p>You may not:</p>
          <ul>
            <li>Use the Services for illegal or fraudulent purposes</li>
            <li>Post unlawful, infringing, or defamatory content</li>
            <li>Circumvent third-party API rate limits</li>
            <li>Scrape or reverse engineer the Services</li>
            <li>Attempt to access other users' data</li>
            <li>Use automated systems to overload the Services</li>
            <li>Violate any third-party platform rules</li>
          </ul>
          <p>Klyc reserves the right to suspend or terminate accounts for violations.</p>

          <h2>6. AI-Generated Content</h2>

          <h3>6.1 Nature of AI Output</h3>
          <p>The Services use artificial intelligence systems that generate content ("Output"). Output may:</p>
          <ul>
            <li>Be similar across users</li>
            <li>Contain inaccuracies</li>
            <li>Reflect biases</li>
            <li>Be incomplete</li>
          </ul>

          <h3>6.2 User Responsibility</h3>
          <p>You are solely responsible for:</p>
          <ul>
            <li>Reviewing Output</li>
            <li>Ensuring compliance with advertising laws</li>
            <li>Ensuring compliance with platform policies</li>
            <li>Ensuring accuracy before publication</li>
          </ul>
          <p>Klyc does not guarantee performance outcomes.</p>

          <h3>6.3 No Professional Advice</h3>
          <p>AI-generated content does not constitute legal, financial, tax, medical, or professional advice.</p>

          <h2>7. Creator Marketplace</h2>
          <p>Klyc may facilitate introductions between Users and independent Creators.</p>
          <ul>
            <li>Creators are independent contractors.</li>
            <li>Klyc is not a party to Creator contracts.</li>
            <li>Klyc does not guarantee Creator quality or performance.</li>
          </ul>
          <p>Any dispute between User and Creator is solely between those parties.</p>

          <h2>8. Intellectual Property</h2>

          <h3>8.1 Klyc Property</h3>
          <p>Klyc retains all rights to:</p>
          <ul>
            <li>Software</li>
            <li>AI models</li>
            <li>Algorithms</li>
            <li>Branding</li>
            <li>Interface design</li>
            <li>API infrastructure</li>
          </ul>

          <h3>8.2 User Content</h3>
          <p>You retain ownership of content you upload.</p>
          <p>You grant Klyc a limited, non-exclusive, royalty-free license to:</p>
          <ul>
            <li>Host</li>
            <li>Process</li>
            <li>Analyze</li>
            <li>Transmit</li>
            <li>Display</li>
          </ul>
          <p>User Content solely to provide and improve the Services.</p>

          <h3>8.3 AI Training</h3>
          <p>Unless otherwise agreed in writing:</p>
          <ul>
            <li>Klyc may use anonymized, aggregated data to improve system performance.</li>
            <li>Klyc will not publicly disclose confidential user data.</li>
            <li>Third-party API data is handled consistent with applicable platform policies.</li>
          </ul>

          <h2>9. Data Security</h2>
          <p>Klyc implements commercially reasonable safeguards, including:</p>
          <ul>
            <li>Encrypted data transmission (TLS)</li>
            <li>Secure credential storage</li>
            <li>Access controls</li>
            <li>Internal permission boundaries</li>
          </ul>
          <p>However, no system is 100% secure.</p>
          <p>You acknowledge that internet-based systems carry inherent risk.</p>

          <h2>10. Fees and Billing</h2>
          <p>Fees are:</p>
          <ul>
            <li>Non-refundable unless required by law</li>
            <li>Subject to change with notice</li>
            <li>Automatically renewing unless canceled</li>
          </ul>
          <p>Failure to pay may result in suspension.</p>

          <h2>11. Limitation of Liability</h2>
          <p className="uppercase">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, KLYC SHALL NOT BE LIABLE FOR: LOST PROFITS, LOST DATA, BUSINESS INTERRUPTION, PLATFORM ACCOUNT SUSPENSIONS, OR THIRD-PARTY PLATFORM ACTIONS.
          </p>
          <p>
            TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF $500 OR THE AMOUNT PAID BY YOU IN THE PRECEDING 12 MONTHS.
          </p>

          <h2>12. Indemnification</h2>
          <p>You agree to indemnify and hold harmless Klyc from claims arising out of:</p>
          <ul>
            <li>Your content</li>
            <li>Your violation of platform policies</li>
            <li>Your misuse of third-party APIs</li>
            <li>Your breach of these Terms</li>
          </ul>

          <h2>13. Suspension and Termination</h2>
          <p>Klyc may suspend or terminate access if:</p>
          <ul>
            <li>You violate these Terms</li>
            <li>Your activity creates legal risk</li>
            <li>A third-party platform requests enforcement</li>
          </ul>
          <p>Termination does not relieve payment obligations.</p>

          <h2>14. Arbitration and Governing Law</h2>
          <p>These Terms are governed by Delaware law.</p>
          <p>Disputes shall be resolved via binding arbitration in Delaware.</p>
          <p>You waive:</p>
          <ul>
            <li>Jury trial</li>
            <li>Class action participation</li>
          </ul>

          <h2>15. Modifications</h2>
          <p>We may update these Terms at any time.</p>
          <p>Continued use constitutes acceptance.</p>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
