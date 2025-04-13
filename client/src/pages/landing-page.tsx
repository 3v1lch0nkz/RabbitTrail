import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, Users, FileText, Search } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/90 to-primary/70 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">RabbitTrail</h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                A collaborative platform for visual mapping and storytelling investigations
              </p>
              <p className="text-lg md:text-xl mb-8 italic opacity-80">
                "Follow the trail, see how deep it goes."
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link href="/auth">
                    <span className="flex items-center">
                      Get Started <ChevronRight className="ml-2 h-5 w-5" />
                    </span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 shadow-xl">
                <div className="w-full h-64 bg-gray-800/50 rounded-md overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/50 text-2xl font-light">Interactive Investigation Map</div>
                  </div>
                  {/* Map Visualization Placeholder */}
                  <div className="absolute bottom-4 right-4 bg-primary/80 p-2 rounded-full">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why RabbitTrail?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MapPin className="h-10 w-10 text-primary" />}
              title="Geospatial Mapping"
              description="Plot evidence and leads on interactive maps to visualize connections and patterns spatially."
            />
            <FeatureCard 
              icon={<Users className="h-10 w-10 text-primary" />}
              title="Real-time Collaboration"
              description="Work together with your team in real-time, sharing discoveries and insights as they happen."
            />
            <FeatureCard 
              icon={<FileText className="h-10 w-10 text-primary" />}
              title="Multimedia Documentation"
              description="Upload images, audio, and text to create rich, comprehensive case files."
            />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create a Project</h3>
              <p className="text-gray-600">
                Start by creating a new investigation project and defining its scope and objectives.
              </p>
            </div>
            <div className="flex-1">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Add Entries</h3>
              <p className="text-gray-600">
                Document evidence, leads, interviews, and notes with geo-tagging and multimedia support.
              </p>
            </div>
            <div className="flex-1">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Collaborate & Analyze</h3>
              <p className="text-gray-600">
                Invite team members, discuss findings, and visualize connections to uncover hidden patterns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start your investigation?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Join a community of investigators, researchers, and hobbyists uncovering the truth one entry at a time.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link href="/auth">
              <span className="flex items-center">
                Begin Your Journey <ChevronRight className="ml-2 h-5 w-5" />
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">RabbitTrail</h3>
              <p className="text-sm text-gray-400">Follow the trail, see how deep it goes.</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/auth" className="text-gray-300 hover:text-white">Sign In</Link>
              <Link href="/auth" className="text-gray-300 hover:text-white">Register</Link>
              <a href="#features" className="text-gray-300 hover:text-white">Features</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} RabbitTrail. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}