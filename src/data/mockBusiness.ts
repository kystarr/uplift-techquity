import type { Business } from "@/types/business";

/**
 * Placeholder mock business for layout design and demos (F9.1.1).
 * Use when backend is unavailable or for Storybook/testing.
 */
export const MOCK_BUSINESS: Business = {
  id: "1",
  name: "Natural Essence Hair Studio",
  description:
    "A welcoming space specializing in natural hair care, braiding, and locs. We celebrate and nurture your natural texture with expert stylists and quality products.",
  email: "hello@naturalessence.com",
  phone: "(555) 123-4567",
  website: "https://naturalessence.com",
  images: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&h=600&fit=crop",
  ],
  isVerified: true,
  tags: ["Natural Hair", "Braiding", "Locs", "Hair Care"],
  categories: ["Beauty & Wellness"],
  averageRating: 4.9,
};
