import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Sparkles, 
  Video, 
  Share2, 
  Users, 
  ArrowRight,
  Rocket,
  Building2,
  Palette,
  BarChart3,
  Check,
  Play
} from "lucide-react";
import klycLogo from "@/assets/klyc-logo.png";

const features = [
  {
    icon: Brain,
    title: "AI Marketing Strategy",
    description: "Klyc learns your brand, audience, and goals to generate ongoing marketing strategies automatically."
  },
  {
    icon: Sparkles,
    title: "Automated Content Creation",
    description: "Turn long-form content, ideas, or campaigns into short-form videos, posts, ads, and visuals — instantly."
  },
  {
    icon: Video,
    title: "AI B-Roll & Visual Generation",
    description: "Automatically generate visual prompts, B-roll, and creative assets aligned to each piece of content."
  },
  {
    icon: Share2,
    title: "Multi-Platform Distribution",
    description: "Publish and manage content across YouTube, TikTok, Instagram, X, LinkedIn, and more — from one dashboard."
  },
  {
    icon: Users,
    title: "Hire Professional Creators",
    description: "Need human creativity? Instantly hire vetted video editors, designers, and creators inside Klyc."
  }
];

const steps = [
  {
    number: "01",
    title: "Connect Your Brand",
    description: "Tell Klyc about your business, upload content, or connect your channels."
  },
  {
    number: "02",
    title: "Strategy & Content Creation",
    description: "Klyc builds a marketing strategy and generates content, visuals, and copy automatically."
  },
  {
    number: "03",
    title: "Publish or Collaborate",
    description: "Publish instantly or collaborate with professional creators for high-end production."
  },
  {
    number: "04",
    title: "Optimize & Scale",
    description: "Track performance, refine strategy, and scale what works — continuously."
  }
];

const audiences = [
  {
    icon: Rocket,
    title: "Founders & Startups",
    description: "Launch and grow without hiring a full marketing team."
  },
  {
    icon: Building2,
    title: "Agencies & Consultants",
    description: "Run multiple client campaigns with AI speed and human flexibility."
  },
  {
    icon: Palette,
    title: "Creators & Brands",
    description: "Scale content without burning out or juggling tools."
  },
  {
    icon: BarChart3,
    title: "Marketing Teams",
    description: "Augment your team with AI execution and creator access."
  }
];

const whyKlyc = [
  "AI + Humans in one platform",
  "Strategy and execution, not just tools",
  "No switching between 10 different apps",
  "Built for real businesses, not just creators"
];

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/home");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <img src={klycLogo} alt="Klyc" className="h-6 sm:h-8" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              onClick={() => navigate("/client/auth")}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs sm:text-sm"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Client Login</span>
              <span className="sm:hidden">Client</span>
            </Button>
            <Button 
              onClick={() => navigate("/auth")}
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Marketer Login</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Centered Large Logo */}
          <div className="mb-8 sm:mb-12">
            <img 
              src={klycLogo} 
              alt="Klyc" 
              className="h-16 sm:h-24 md:h-32 mx-auto"
            />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight mb-4 sm:mb-6">
            Your AI Marketing Agent<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              From Strategy to Execution
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Klyc plans, creates, distributes, and optimizes your marketing — combining AI automation with access to real professional creators when you need human polish.
          </p>
          
          {/* Two Sign-in Options */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-8 sm:mb-10">
            {/* Marketer Portal */}
            <div 
              onClick={() => navigate("/auth")}
              className="group cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Marketer Portal</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                Create campaigns, generate content, and manage your marketing strategy with AI.
              </p>
              <div className="inline-flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
                Sign in as Marketer
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Client Portal */}
            <div 
              onClick={() => navigate("/client/auth")}
              className="group cursor-pointer bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Client Portal</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                Review campaigns, provide feedback, and approve content from your marketing team.
              </p>
              <div className="inline-flex items-center text-purple-600 font-medium text-sm group-hover:gap-2 transition-all">
                Sign in as Client
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button 
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl"
            >
              <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Watch How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* What Klyc Does */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              Marketing, Done — End to End
            </h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center mb-4 sm:mb-5">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              How Klyc Works
            </h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-100 mb-2 sm:mb-4">
                  {step.number}
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              Built for Teams That Want Results
            </h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {audiences.map((audience, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <audience.icon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                  {audience.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Klyc */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              Why Klyc
            </h2>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-12">
            {whyKlyc.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <span className="text-sm sm:text-base text-gray-800 font-medium">{item}</span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-gray-600 text-sm sm:text-lg max-w-2xl mx-auto">
            Klyc replaces your content tools, planning docs, creator sourcing, and distribution dashboards — with one intelligent system.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
            Stop Managing Marketing.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Start Executing It.
            </span>
          </h2>
          
          <p className="text-gray-400 text-sm sm:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto">
            Let Klyc handle the work — strategy, content, distribution, and creators — so you can focus on growth.
          </p>
          
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white hover:bg-gray-100 text-gray-900 px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-xl font-semibold w-full sm:w-auto"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={klycLogo} alt="Klyc" className="h-5 sm:h-6 brightness-0 invert" />
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
            <a href="/terms" className="hover:text-gray-300 transition-colors">Terms</a>
            <span>|</span>
            <a href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</a>
            <span>|</span>
            <a href="/admin/login" className="hover:text-gray-300 transition-colors">Admin</a>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} Klyc
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
