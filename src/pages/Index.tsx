import { Hero } from "@/components/Hero";
import { FeaturesSection } from "@/components/FeaturesSection";

const Index = () => {
  return (
    <div className="bg-background">
      <Hero />
      <FeaturesSection />
      
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-panel max-w-3xl mx-auto rounded-2xl p-10">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Every purchase from a minority-owned business helps close the wealth gap and builds stronger, more equitable communities.
          </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
