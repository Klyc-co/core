import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Profile from "./pages/Profile";
import CompanyInfo from "./pages/CompanyInfo";
import TargetAudience from "./pages/TargetAudience";
import ValueProposition from "./pages/ValueProposition";
import ImportBrandSources from "./pages/ImportBrandSources";
import Library from "./pages/Library";
import SocialMediaAssets from "./pages/SocialMediaAssets";
import Products from "./pages/Products";
import CreateProduct from "./pages/CreateProduct";
import CreateProductLine from "./pages/CreateProductLine";
import Campaigns from "./pages/Campaigns";
import NewCampaign from "./pages/NewCampaign";
import Schedule from "./pages/Schedule";
import GenerateCampaignIdeas from "./pages/GenerateCampaignIdeas";
import CampaignDrafts from "./pages/CampaignDrafts";
import CampaignDraftView from "./pages/CampaignDraftView";
import BrandStrategy from "./pages/BrandStrategy";
import TrendMonitor from "./pages/TrendMonitor";
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
import TikTokAnalytics from "./pages/TikTokAnalytics";
import InstagramAnalytics from "./pages/InstagramAnalytics";
import YouTubeAnalytics from "./pages/YouTubeAnalytics";
import FacebookAnalytics from "./pages/FacebookAnalytics";
import TwitterAnalytics from "./pages/TwitterAnalytics";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const WithSidebar = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout showSidebar={true}>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          
          {/* Client Portal routes */}
          <Route path="/client/auth" element={<ClientAuth />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/profile" element={<ClientProfile />} />
          <Route path="/client/profile/social" element={<ClientSocialAssets />} />
          <Route path="/client/campaigns" element={<ClientCampaigns />} />
          <Route path="/client/approvals" element={<ClientApprovals />} />
          <Route path="/client/insights" element={<ClientInsights />} />
          <Route path="/client/settings" element={<ClientSettings />} />
          <Route path="/client/strategy" element={<ClientStrategy />} />
          <Route path="/client/strategy/trends" element={<ClientTrendMonitor />} />
          <Route path="/client/strategy/competitors" element={<ClientCompetitorAnalysis />} />
          <Route path="/client/messages" element={<Messages portalType="client" />} />
          
          {/* Marketer routes with sidebar */}
          <Route path="/home" element={<WithSidebar><Home /></WithSidebar>} />
          <Route path="/projects" element={<WithSidebar><Projects /></WithSidebar>} />
          <Route path="/projects/new" element={<WithSidebar><NewProject /></WithSidebar>} />
          <Route path="/projects/:id/processing" element={<WithSidebar><Processing /></WithSidebar>} />
          <Route path="/projects/:id/edit" element={<WithSidebar><ProjectEdit /></WithSidebar>} />
          <Route path="/settings" element={<WithSidebar><Settings /></WithSidebar>} />
          <Route path="/profile" element={<WithSidebar><Profile /></WithSidebar>} />
          <Route path="/profile/company" element={<WithSidebar><CompanyInfo /></WithSidebar>} />
          <Route path="/profile/audience" element={<WithSidebar><TargetAudience /></WithSidebar>} />
          <Route path="/profile/value" element={<WithSidebar><ValueProposition /></WithSidebar>} />
          <Route path="/profile/import" element={<WithSidebar><ImportBrandSources /></WithSidebar>} />
          <Route path="/profile/library" element={<WithSidebar><Library /></WithSidebar>} />
          <Route path="/profile/social" element={<WithSidebar><SocialMediaAssets /></WithSidebar>} />
          <Route path="/profile/products" element={<WithSidebar><Products /></WithSidebar>} />
          <Route path="/profile/products/create" element={<WithSidebar><CreateProduct /></WithSidebar>} />
          <Route path="/profile/products/create-line" element={<WithSidebar><CreateProductLine /></WithSidebar>} />
          <Route path="/campaigns" element={<WithSidebar><Campaigns /></WithSidebar>} />
          <Route path="/campaigns/new" element={<WithSidebar><NewCampaign /></WithSidebar>} />
          <Route path="/campaigns/schedule" element={<WithSidebar><Schedule /></WithSidebar>} />
          <Route path="/campaigns/generate" element={<WithSidebar><GenerateCampaignIdeas /></WithSidebar>} />
          <Route path="/campaigns/drafts" element={<WithSidebar><CampaignDrafts /></WithSidebar>} />
          <Route path="/campaigns/drafts/:id" element={<WithSidebar><CampaignDraftView /></WithSidebar>} />
          <Route path="/brand-strategy" element={<WithSidebar><BrandStrategy /></WithSidebar>} />
          <Route path="/trend-monitor" element={<WithSidebar><TrendMonitor /></WithSidebar>} />
          <Route path="/competitor-analysis" element={<WithSidebar><CompetitorAnalysis /></WithSidebar>} />
          <Route path="/profile/tiktok-analytics" element={<WithSidebar><TikTokAnalytics /></WithSidebar>} />
          <Route path="/profile/instagram-analytics" element={<WithSidebar><InstagramAnalytics /></WithSidebar>} />
          <Route path="/profile/youtube-analytics" element={<WithSidebar><YouTubeAnalytics /></WithSidebar>} />
          <Route path="/profile/facebook-analytics" element={<WithSidebar><FacebookAnalytics /></WithSidebar>} />
          <Route path="/profile/twitter-analytics" element={<WithSidebar><TwitterAnalytics /></WithSidebar>} />
          <Route path="/messages" element={<WithSidebar><Messages portalType="marketer" /></WithSidebar>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
