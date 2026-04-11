import { Hero } from "@/components/Hero";
import { FeaturesSection } from "@/components/FeaturesSection";
import { useScrollParallax } from "@/hooks/use-scroll-parallax";

const Index = () => {
  const sy = useScrollParallax();

  return (
    <div className="bg-background">
      <Hero scrollParallaxY={sy} />
      <FeaturesSection scrollParallaxY={sy} />
    </div>
  );
};

export default Index;
