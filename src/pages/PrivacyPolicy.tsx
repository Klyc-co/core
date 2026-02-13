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
          <h1 className="text-3xl font-bold text-foreground mb-2">KLYC PRIVACY POLICY</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 6, 2026</p>

          <p>
            Klyc, Inc. ("Klyc," "we," "us," or "our") respects your privacy and is committed to protecting personal information. This Privacy Policy describes how we collect, use, disclose, and safeguard information when you access or use our website, applications, APIs, AI systems, creator marketplace, and related services (collectively, the "Services").
          </p>
          <p>
            By using the Services, you acknowledge that you have read and understood this Privacy Policy.
          </p>

          <h2>1. Scope</h2>
          <p>This Privacy Policy applies to:</p>
          <ul>
            <li>Website visitors</li>
            <li>Registered users</li>
            <li>Creator marketplace participants</li>
            <li>Individuals whose data is processed via third-party platform integrations</li>
          </ul>
          <p>It does not apply to third-party services you connect to Klyc.</p>

          <h2>2. Information We Collect</h2>
          <p>We collect information in the following categories:</p>

          <h3>2.1 Information You Provide Directly</h3>

          <p><strong>Account Information</strong></p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Company name</li>
            <li>Password (encrypted)</li>
            <li>Professional profile information</li>
          </ul>

          <p><strong>User Content</strong></p>
          <ul>
            <li>Text</li>
            <li>Images</li>
            <li>Video</li>
            <li>Audio</li>
            <li>Campaign materials</li>
            <li>Prompts submitted to AI systems</li>
          </ul>

          <p><strong>Billing Information</strong></p>
          <ul>
            <li>Billing address</li>
            <li>Transaction history</li>
            <li>Subscription details</li>
          </ul>
          <p>(Payment card data is processed by third-party payment processors such as Stripe. We do not store full card numbers.)</p>

          <p><strong>Communications</strong></p>
          <ul>
            <li>Support tickets</li>
            <li>Emails</li>
            <li>Feedback</li>
            <li>Creator marketplace communications</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>

          <p><strong>Usage Data</strong></p>
          <ul>
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device identifiers</li>
            <li>Session timestamps</li>
            <li>Pages viewed</li>
            <li>Feature usage</li>
            <li>Interaction logs with AI systems</li>
          </ul>

          <p><strong>Log Data</strong></p>
          <ul>
            <li>API requests</li>
            <li>System events</li>
            <li>Error logs</li>
            <li>Performance data</li>
          </ul>

          <p><strong>Cookies and Similar Technologies</strong></p>
          <p>We use cookies for:</p>
          <ul>
            <li>Authentication</li>
            <li>Security</li>
            <li>Analytics</li>
            <li>Platform functionality</li>
          </ul>
          <p>You may disable cookies via browser settings.</p>

          <h3>2.3 Information from Third-Party Integrations</h3>
          <p>If you connect a third-party platform (e.g., YouTube, TikTok, Meta, LinkedIn, ClickUp):</p>
          <p>We may access:</p>
          <ul>
            <li>Account identifiers</li>
            <li>Profile information</li>
            <li>Post metadata</li>
            <li>Performance analytics</li>
            <li>Campaign metrics</li>
            <li>Workspace data (for productivity integrations)</li>
          </ul>
          <p>We access only the data necessary to provide requested Services.</p>
          <p>We do not access private messages unless explicitly authorized.</p>
          <p>We do not sell third-party API data.</p>

          <h2>3. How We Use Information</h2>
          <p>We process information to:</p>

          <h3>3.1 Provide Services</h3>
          <ul>
            <li>Operate AI content generation</li>
            <li>Publish content to connected platforms</li>
            <li>Display analytics</li>
            <li>Enable Creator marketplace functionality</li>
            <li>Manage subscriptions</li>
          </ul>

          <h3>3.2 Improve the Platform</h3>
          <ul>
            <li>Enhance AI systems</li>
            <li>Improve feature performance</li>
            <li>Detect bugs</li>
            <li>Optimize workflows</li>
          </ul>

          <h3>3.3 Security &amp; Fraud Prevention</h3>
          <ul>
            <li>Detect abuse</li>
            <li>Monitor suspicious activity</li>
            <li>Enforce Terms of Service</li>
          </ul>

          <h3>3.4 Communications</h3>
          <ul>
            <li>Send service updates</li>
            <li>Respond to support inquiries</li>
            <li>Send billing notices</li>
          </ul>
          <p>We do not sell personal information.</p>

          <h2>4. AI Training &amp; Model Use</h2>
          <p>Klyc may use:</p>
          <ul>
            <li>Aggregated</li>
            <li>Anonymized</li>
            <li>De-identified</li>
          </ul>
          <p>data to improve internal AI systems.</p>
          <p>We do not:</p>
          <ul>
            <li>Publicly disclose user content</li>
            <li>Sell user content to third parties</li>
            <li>Use third-party platform data beyond permitted API terms</li>
          </ul>
          <p>Users may opt out of AI model training by contacting: <strong>privacy@klyc.ai</strong></p>
          <p>Opt-out requests may limit certain features.</p>

          <h2>5. Legal Bases for Processing (GDPR)</h2>
          <p>For users in the European Economic Area (EEA), we process personal data under the following lawful bases:</p>
          <ul>
            <li>Performance of a contract</li>
            <li>Legitimate interests (platform improvement, fraud prevention)</li>
            <li>Legal compliance</li>
            <li>Consent (where required)</li>
          </ul>

          <h2>6. Sharing of Information</h2>
          <p>We may share information:</p>

          <h3>6.1 Service Providers</h3>
          <p>With trusted vendors for:</p>
          <ul>
            <li>Cloud hosting (e.g., AWS, Google Cloud)</li>
            <li>Payment processing</li>
            <li>Customer support tools</li>
            <li>Security monitoring</li>
          </ul>
          <p>Vendors are contractually obligated to safeguard data.</p>

          <h3>6.2 Creator Marketplace</h3>
          <p>If you engage a Creator, we may share limited necessary information to facilitate the relationship.</p>

          <h3>6.3 Legal Compliance</h3>
          <p>If required by law, subpoena, or governmental request.</p>

          <h3>6.4 Business Transfers</h3>
          <p>In connection with mergers, acquisitions, or asset sales.</p>
          <p>We do not sell personal information.</p>

          <h2>7. Data Retention</h2>
          <p>We retain personal data:</p>
          <ul>
            <li>As long as your account is active</li>
            <li>As required for legal obligations</li>
            <li>For legitimate business purposes</li>
          </ul>
          <p>Deleted accounts may have residual data retained for legal compliance or fraud prevention.</p>

          <h2>8. Data Security</h2>
          <p>We implement commercially reasonable security measures, including:</p>
          <ul>
            <li>Encrypted transmission (TLS)</li>
            <li>Encrypted credential storage</li>
            <li>Role-based access controls</li>
            <li>Secure cloud infrastructure</li>
            <li>Audit logging</li>
          </ul>
          <p>However, no method of transmission over the internet is 100% secure.</p>

          <h2>9. Your Rights</h2>
          <p>Depending on your location, you may have rights to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion</li>
            <li>Restrict processing</li>
            <li>Object to processing</li>
            <li>Request portability</li>
            <li>Withdraw consent</li>
            <li>Opt out of marketing communications</li>
          </ul>
          <p>To exercise rights, contact: <strong>privacy@klyc.ai</strong></p>
          <p>We may verify identity before fulfilling requests.</p>

          <h2>10. California Privacy Rights (CCPA)</h2>
          <p>California residents may:</p>
          <ul>
            <li>Request disclosure of collected categories of data</li>
            <li>Request deletion</li>
            <li>Opt out of "sale" (we do not sell personal data)</li>
            <li>Request non-discrimination</li>
          </ul>
          <p>Requests may be submitted to <strong>privacy@klyc.ai</strong>.</p>

          <h2>11. International Transfers</h2>
          <p>Klyc is headquartered in the United States.</p>
          <p>By using the Services, you consent to the transfer of information to the U.S., where data protection laws may differ.</p>
          <p>We implement safeguards consistent with applicable law.</p>

          <h2>12. Children's Privacy</h2>
          <p>The Services are not intended for individuals under 18.</p>
          <p>We do not knowingly collect personal information from children.</p>
          <p>If discovered, such information will be deleted.</p>

          <h2>13. Third-Party Services</h2>
          <p>When you connect external platforms:</p>
          <ul>
            <li>Their privacy policies apply</li>
            <li>Their data processing practices are independent of Klyc</li>
          </ul>
          <p>We encourage reviewing their policies.</p>

          <h2>14. Automated Decision Making</h2>
          <p>Klyc may use AI-driven systems to:</p>
          <ul>
            <li>Generate content</li>
            <li>Provide recommendations</li>
            <li>Analyze performance</li>
          </ul>
          <p>These systems do not make legally binding automated decisions without human oversight.</p>

          <h2>15. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically.</p>
          <p>Material changes will be indicated by updating the "Last Updated" date.</p>
          <p>Continued use constitutes acceptance.</p>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
