import { Search, Shield, MessageCircle, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Discovery",
    description: "Find businesses by location, category, voice search, or even upload photos to discover similar services.",
  },
  {
    icon: Shield,
    title: "Verified & Trusted",
    description: "Every business goes through verification to ensure authenticity and protect our community.",
  },
  {
    icon: MessageCircle,
    title: "Direct Connection",
    description: "Message business owners directly, leave reviews, and share your favorite finds on social media.",
  },
  {
    icon: TrendingUp,
    title: "Growth Analytics",
    description: "Business owners get insights on customer trends, ratings, and visibility to help grow their enterprise.",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Built for Community Empowerment
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform bridges the gap between minority-owned businesses and customers who want to support them.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-card rounded-lg p-6 shadow-md hover:shadow-xl transition-smooth border border-border"
              >
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
