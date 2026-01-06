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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={klycLogo} alt="Klyc" className="h-8" />
          <Button 
            onClick={() => navigate("/auth")}
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Sign in
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Centered Large Logo */}
          <div className="mb-12">
            <img 
              src={klycLogo} 
              alt="Klyc" 
              className="h-24 md:h-32 mx-auto"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
            Your AI Marketing Agent —<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              From Strategy to Execution
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Klyc plans, creates, distributes, and optimizes your marketing — combining AI automation with access to real professional creators when you need human polish.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl"
            >
              <Play className="mr-2 h-5 w-5" />
              Watch How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* What Klyc Does */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Marketing, Done — End to End
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              How Klyc Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-gray-100 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Built for Teams That Want Results
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {audiences.map((audience, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-6 border border-gray-100 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <audience.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {audience.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Klyc */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Klyc
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {whyKlyc.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-800 font-medium">{item}</span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-gray-600 text-lg max-w-2xl mx-auto">
            Klyc replaces your content tools, planning docs, creator sourcing, and distribution dashboards — with one intelligent system.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Stop Managing Marketing.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Start Executing It.
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Let Klyc handle the work — strategy, content, distribution, and creators — so you can focus on growth.
          </p>
          
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white hover:bg-gray-100 text-gray-900 px-10 py-6 text-lg rounded-xl font-semibold"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={klycLogo} alt="Klyc" className="h-6 brightness-0 invert" />
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</a>
            <span>|</span>
            <a href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Klyc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
