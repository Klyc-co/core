import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClientProvider } from "./contexts/ClientContext";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClientAuth from "./pages/ClientAuth";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProfile from "./pages/ClientProfile";
import ClientCampaigns from "./pages/ClientCampaigns";
import ClientApprovals from "./pages/ClientApprovals";
import ClientInsights from "./pages/ClientInsights";
import ClientSettings from "./pages/ClientSettings";
import ClientSocialAssets from "./pages/ClientSocialAssets";
import ClientStrategy from "./pages/ClientStrategy";
import ClientTrendMonitor from "./pages/ClientTrendMonitor";
import ClientCompetitorAnalysis from "./pages/ClientCompetitorAnalysis";
import Messages from "./pages/Messages";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import Processing from "./pages/Processing";
import ProjectEdit from "./pages/ProjectEdit";
import Settings from "./pages/Settings";
import ProfileOverview from "./pages/ProfileOverview";
import CompanyInfo from "./pages/CompanyInfo";
import CampaignCommandCenter from "./pages/CampaignCommandCenter";
import CampaignKnowledgeCenter from "./pages/CampaignKnowledgeCenter";
import TargetAudience from "./pages/TargetAudience";
import ValueProposition from "./pages/ValueProposition";
import ImportBrandSources from "./pages/ImportBrandSources";
import ImportAssetSources from "./pages/ImportAssetSources";
import Library from "./pages/Library";
import SocialMediaAssets from "./pages/SocialMediaAssets";
import Products from "./pages/Products";
import CreateProduct from "./pages/CreateProduct";
import CreateProductLine from "./pages/CreateProductLine";
import EditProduct from "./pages/EditProduct";
import Campaigns from "./pages/Campaigns";
import NewCampaign from "./pages/NewCampaign";
import Schedule from "./pages/Schedule";
import GenerateCampaignIdeas from "./pages/GenerateCampaignIdeas";
import PendingApprovals from "./pages/PendingApprovals";
import CampaignDrafts from "./pages/CampaignDrafts";
import CampaignDraftView from "./pages/CampaignDraftView";
import BrandStrategy from "./pages/BrandStrategy";
import StrategyIntelligence from "./pages/StrategyIntelligence";
import TrendMonitor from "./pages/TrendMonitor";
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
import ImageEditor from "./pages/ImageEditor";
import CreativeStudio from "./pages/CreativeStudio";
import TikTokAnalytics from "./pages/TikTokAnalytics";
import InstagramAnalytics from "./pages/InstagramAnalytics";
import YouTubeAnalytics from "./pages/YouTubeAnalytics";
import FacebookAnalytics from "./pages/FacebookAnalytics";
import TwitterAnalytics from "./pages/TwitterAnalytics";
import LinkedInAnalytics from "./pages/LinkedInAnalytics";
import FullAnalytics from "./pages/FullAnalytics";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminWaitlist from "./pages/AdminWaitlist";
import Waitlist from "./pages/Waitlist";
import Team from "./pages/Team";
import TrelloCallback from "./pages/TrelloCallback";
import OrchestratorPanel from "./pages/OrchestratorPanel";
import PostQueueManager from "./pages/PostQueueManager";
import PublishStatusDashboard from "./pages/PublishStatusDashboard";
import AiCostMonitor from "./pages/AiCostMonitor";
import ClientOnboarding from "./pages/ClientOnboarding";
import ActivityFeed from "./pages/ActivityFeed";
import CrmContacts from "./pages/CrmContacts";
import CrmDeals from "./pages/CrmDeals";
import CrmOrders from "./pages/CrmOrders";
import ReportsPage from "./pages/ReportsPage";
import OrchestratorGraph from "./pages/OrchestratorGraph";
import Onboarding from "./pages/Onboarding";
import SmartPromptDemo from "./pages/SmartPromptDemo";
import StrategyDashboard from "./pages/StrategyDashboard";
import CustomerStrategyAnalysis from "./pages/CustomerStrategyAnalysis";
import LearningHub from "./pages/LearningHub";
import CreativeStudioPage from "./pages/CreativeStudioPage";
import KlycAdminLogin from "./pages/KlycAdminLogin";
import KlycAdminDashboard from "./pages/KlycAdminDashboard";
import KlycAdminOverview from "./pages/KlycAdminOverview";
import KlycAdminClients from "./pages/KlycAdminClients";
import KlycAdminClientDetail from "./pages/KlycAdminClientDetail";
import KlycAdminRevenue from "./pages/KlycAdminRevenue";
import KlycAdminInfrastructure from "./pages/KlycAdminInfrastructure";
import KlycAdminCompression from "./pages/KlycAdminCompression";
import KlycAdminSubminds from "./pages/KlycAdminSubminds";
import KlycAdminInternal from "./pages/KlycAdminInternal";
import KlycAdminCollaboration from "./pages/KlycAdminCollaboration";
import KlycAdminCollaborationDetail from "./pages/KlycAdminCollaborationDetail";
import KlycAdminDispatch from "./pages/KlycAdminDispatch";
import KlycAdminVoting from "./pages/KlycAdminVoting";
import KlycAdminRoadmap from "./pages/KlycAdminRoadmap";
import KlycAdminMarketing from "./pages/KlycAdminMarketing";
import KlycAdminFinancials from "./pages/KlycAdminFinancials";
import KlycAdminAiTesting from "./pages/KlycAdminAiTesting";
import KlycAdminChannels from "./pages/KlycAdminChannels";
import KlycAdminAudit from "./pages/KlycAdminAudit";
import KlycAdminGuard from "./components/admin/KlycAdminGuard";
import KlycAdminLayout from "./components/admin/KlycAdminLayout";

const queryClient = new QueryClient();

const WithSidebar = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRole="marketer" unauthRedirectTo="/auth" wrongRoleRedirectTo="/client/dashboard">
    <AppLayout showSidebar={true}>{children}</AppLayout>
  </ProtectedRoute>
);

const ClientProtected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRole="client" unauthRedirectTo="/client/auth" wrongRoleRedirectTo="/home">
    {children}
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ClientProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/waitlist" element={<AdminWaitlist />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/klyc_admin" element={<KlycAdminLogin />} />
            <Route path="/klyc_admin/dashboard" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminDashboard /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/overview" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminOverview /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/clients" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminClients /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/clients/:id" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminClientDetail /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/revenue" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminRevenue /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/infrastructure" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminInfrastructure /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/compression" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminCompression /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/subminds" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminSubminds /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/klyc-internal" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminInternal /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/collaboration" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminCollaboration /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/collaboration/:id" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminCollaborationDetail /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/dispatch" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminDispatch /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/voting" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminVoting /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/roadmap" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminRoadmap /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/marketing" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminMarketing /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/financials" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminFinancials /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/ai-testing" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminAiTesting /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/channels" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminChannels /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/audit" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminAudit /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/klyc_admin/*" element={<KlycAdminGuard><KlycAdminLayout><KlycAdminOverview /></KlycAdminLayout></KlycAdminGuard>} />
            <Route path="/team" element={<Team />} />
            <Route path="/client/auth" element={<ClientAuth />} />
            <Route path="/client/dashboard" element={<ClientProtected><ClientDashboard /></ClientProtected>} />
            <Route path="/client/profile" element={<ClientProtected><ClientProfile /></ClientProtected>} />
            <Route path="/client/profile/social" element={<ClientProtected><ClientSocialAssets /></ClientProtected>} />
            <Route path="/client/campaigns" element={<ClientProtected><ClientCampaigns /></ClientProtected>} />
            <Route path="/client/approvals" element={<ClientProtected><ClientApprovals /></ClientProtected>} />
            <Route path="/client/insights" element={<ClientProtected><ClientInsights /></ClientProtected>} />
            <Route path="/client/settings" element={<ClientProtected><ClientSettings /></ClientProtected>} />
            <Route path="/client/strategy" element={<ClientProtected><ClientStrategy /></ClientProtected>} />
            <Route path="/client/strategy/trends" element={<ClientProtected><ClientTrendMonitor /></ClientProtected>} />
            <Route path="/client/strategy/competitors" element={<ClientProtected><ClientCompetitorAnalysis /></ClientProtected>} />
            <Route path="/client/messages" element={<ClientProtected><Messages portalType="client" /></ClientProtected>} />
            <Route path="/home" element={<WithSidebar><Home /></WithSidebar>} />
            <Route path="/projects" element={<WithSidebar><Projects /></WithSidebar>} />
            <Route path="/projects/new" element={<WithSidebar><NewProject /></WithSidebar>} />
            <Route path="/projects/:id/processing" element={<WithSidebar><Processing /></WithSidebar>} />
            <Route path="/projects/:id/edit" element={<WithSidebar><ProjectEdit /></WithSidebar>} />
            <Route path="/settings" element={<WithSidebar><Settings /></WithSidebar>} />
            <Route path="/profile" element={<WithSidebar><ProfileOverview /></WithSidebar>} />
            <Route path="/profile/company" element={<WithSidebar><CompanyInfo /></WithSidebar>} />
            <Route path="/profile/audience" element={<WithSidebar><TargetAudience /></WithSidebar>} />
            <Route path="/profile/value" element={<WithSidebar><ValueProposition /></WithSidebar>} />
            <Route path="/profile/import" element={<WithSidebar><ImportBrandSources /></WithSidebar>} />
            <Route path="/profile/library" element={<WithSidebar><Library /></WithSidebar>} />
            <Route path="/profile/library/import" element={<WithSidebar><ImportAssetSources /></WithSidebar>} />
            <Route path="/profile/social" element={<WithSidebar><SocialMediaAssets /></WithSidebar>} />
            <Route path="/profile/products" element={<WithSidebar><Products /></WithSidebar>} />
            <Route path="/profile/products/create" element={<WithSidebar><CreateProduct /></WithSidebar>} />
            <Route path="/profile/products/create-line" element={<WithSidebar><CreateProductLine /></WithSidebar>} />
            <Route path="/profile/products/edit/:productId" element={<WithSidebar><EditProduct /></WithSidebar>} />
            <Route path="/campaigns" element={<WithSidebar><Campaigns /></WithSidebar>} />
            <Route path="/campaigns/command" element={<WithSidebar><CampaignCommandCenter /></WithSidebar>} />
            <Route path="/campaigns/knowledge" element={<WithSidebar><CampaignKnowledgeCenter /></WithSidebar>} />
            <Route path="/campaigns/new" element={<WithSidebar><NewCampaign /></WithSidebar>} />
            <Route path="/campaigns/schedule" element={<WithSidebar><Schedule /></WithSidebar>} />
            <Route path="/campaigns/generate" element={<WithSidebar><GenerateCampaignIdeas /></WithSidebar>} />
            <Route path="/campaigns/pending" element={<WithSidebar><PendingApprovals /></WithSidebar>} />
            <Route path="/campaigns/drafts" element={<WithSidebar><CampaignDrafts /></WithSidebar>} />
            <Route path="/campaigns/drafts/:id" element={<WithSidebar><CampaignDraftView /></WithSidebar>} />
            <Route path="/brand-strategy" element={<WithSidebar><BrandStrategy /></WithSidebar>} />
            <Route path="/brand-strategy/intelligence" element={<WithSidebar><StrategyIntelligence /></WithSidebar>} />
            <Route path="/trend-monitor" element={<WithSidebar><TrendMonitor /></WithSidebar>} />
            <Route path="/competitor-analysis" element={<WithSidebar><CompetitorAnalysis /></WithSidebar>} />
            <Route path="/image-editor" element={<WithSidebar><ImageEditor /></WithSidebar>} />
            <Route path="/creative" element={<WithSidebar><CreativeStudio /></WithSidebar>} />
            <Route path="/profile/tiktok-analytics" element={<WithSidebar><TikTokAnalytics /></WithSidebar>} />
            <Route path="/profile/instagram-analytics" element={<WithSidebar><InstagramAnalytics /></WithSidebar>} />
            <Route path="/profile/youtube-analytics" element={<WithSidebar><YouTubeAnalytics /></WithSidebar>} />
            <Route path="/profile/facebook-analytics" element={<WithSidebar><FacebookAnalytics /></WithSidebar>} />
            <Route path="/profile/twitter-analytics" element={<WithSidebar><TwitterAnalytics /></WithSidebar>} />
            <Route path="/profile/linkedin-analytics" element={<WithSidebar><LinkedInAnalytics /></WithSidebar>} />
            <Route path="/analytics" element={<WithSidebar><FullAnalytics /></WithSidebar>} />
            <Route path="/messages" element={<WithSidebar><Messages portalType="marketer" /></WithSidebar>} />
            <Route path="/trello-callback" element={<TrelloCallback />} />
            <Route path="/orchestrator" element={<WithSidebar><OrchestratorPanel /></WithSidebar>} />
            <Route path="/orchestrator/graph" element={<WithSidebar><OrchestratorGraph /></WithSidebar>} />
            <Route path="/campaigns/queue" element={<WithSidebar><PostQueueManager /></WithSidebar>} />
            <Route path="/publishing/status" element={<WithSidebar><PublishStatusDashboard /></WithSidebar>} />
            <Route path="/analytics/ai-costs" element={<WithSidebar><AiCostMonitor /></WithSidebar>} />
            <Route path="/activity" element={<WithSidebar><ActivityFeed /></WithSidebar>} />
            <Route path="/crm/contacts" element={<WithSidebar><CrmContacts /></WithSidebar>} />
            <Route path="/crm/deals" element={<WithSidebar><CrmDeals /></WithSidebar>} />
            <Route path="/crm/orders" element={<WithSidebar><CrmOrders /></WithSidebar>} />
            <Route path="/reports" element={<WithSidebar><ReportsPage /></WithSidebar>} />
            <Route path="/reports/scheduled" element={<WithSidebar><ReportsPage /></WithSidebar>} />
            <Route path="/strategy" element={<WithSidebar><StrategyDashboard /></WithSidebar>} />
            <Route path="/strategy/customer-analysis" element={<WithSidebar><CustomerStrategyAnalysis /></WithSidebar>} />
            <Route path="/learning" element={<WithSidebar><LearningHub /></WithSidebar>} />
            <Route path="/creative-studio" element={<WithSidebar><CreativeStudio /></WithSidebar>} />
            <Route path="/demo/smart-prompt" element={<SmartPromptDemo />} />
            <Route path="/client/onboarding" element={<ClientProtected><ClientOnboarding /></ClientProtected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ClientProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
