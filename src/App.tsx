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
import TrendMonitor from "./pages/TrendMonitor";
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
import ImageEditor from "./pages/ImageEditor";
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
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/meet-the-team" element={<MeetTheTeam />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Client Portal routes */}
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
            
            {/* Marketer routes with sidebar */}
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
            <Route path="/campaigns/new" element={<WithSidebar><NewCampaign /></WithSidebar>} />
            <Route path="/campaigns/schedule" element={<WithSidebar><Schedule /></WithSidebar>} />
            <Route path="/campaigns/generate" element={<WithSidebar><GenerateCampaignIdeas /></WithSidebar>} />
            <Route path="/campaigns/pending" element={<WithSidebar><PendingApprovals /></WithSidebar>} />
            <Route path="/campaigns/drafts" element={<WithSidebar><CampaignDrafts /></WithSidebar>} />
            <Route path="/campaigns/drafts/:id" element={<WithSidebar><CampaignDraftView /></WithSidebar>} />
            <Route path="/brand-strategy" element={<WithSidebar><BrandStrategy /></WithSidebar>} />
            <Route path="/trend-monitor" element={<WithSidebar><TrendMonitor /></WithSidebar>} />
            <Route path="/competitor-analysis" element={<WithSidebar><CompetitorAnalysis /></WithSidebar>} />
            <Route path="/image-editor" element={<WithSidebar><ImageEditor /></WithSidebar>} />
            <Route path="/profile/tiktok-analytics" element={<WithSidebar><TikTokAnalytics /></WithSidebar>} />
            <Route path="/profile/instagram-analytics" element={<WithSidebar><InstagramAnalytics /></WithSidebar>} />
            <Route path="/profile/youtube-analytics" element={<WithSidebar><YouTubeAnalytics /></WithSidebar>} />
            <Route path="/profile/facebook-analytics" element={<WithSidebar><FacebookAnalytics /></WithSidebar>} />
            <Route path="/profile/twitter-analytics" element={<WithSidebar><TwitterAnalytics /></WithSidebar>} />
            <Route path="/profile/linkedin-analytics" element={<WithSidebar><LinkedInAnalytics /></WithSidebar>} />
            <Route path="/analytics" element={<WithSidebar><FullAnalytics /></WithSidebar>} />
            <Route path="/messages" element={<WithSidebar><Messages portalType="marketer" /></WithSidebar>} />
            
            <Route path="/trello-callback" element={<TrelloCallback />} />
            
            {/* Orchestrator & System routes */}
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
            
            {/* Client onboarding */}
            <Route path="/client/onboarding" element={<ClientProtected><ClientOnboarding /></ClientProtected>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ClientProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
