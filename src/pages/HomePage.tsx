import { useState, useEffect } from "react";
import { useScroll, useTransform } from "framer-motion";
import { StickersLayer, StickerData } from "@/components/StickersLayer";
import { HeroSection } from "@/components/home/HeroSection";
import { AIFeaturesSection } from "@/components/home/AIFeaturesSection";
import { BehaviorLogicSection } from "@/components/home/BehaviorLogicSection";
import { HomeProofSection } from "@/components/home/HomeProofSection";
import { StatsSection, CacheStats } from "@/components/home/StatsSection";
import { CTASection } from "@/components/home/CTASection";

const homeStickers: StickerData[] = [
  { src: "/sticker/1-61-256b.png", side: "left", top: "18%", rotation: -12 },
  { src: "/sticker/1-67-256b.png", side: "right", top: "35%", rotation: 10 },
  { src: "/sticker/1-86-256b.png", side: "left", top: "55%", rotation: 8 },
  { src: "/sticker/1-71-256b.png", side: "right", top: "72%", rotation: -10 },
  { src: "/sticker/1-54-256b.png", side: "left", top: "85%", rotation: 15 },
];

export function HomePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/cache-stats");
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    }
    loadStats();
  }, []);

  const { scrollY } = useScroll();
  const orb1Y = useTransform(scrollY, value => value * 0.3);
  const orb2Y = useTransform(scrollY, value => value * 0.2);

  return (
    <div className="relative bg-background text-foreground selection:bg-foreground/20">
      <StickersLayer items={homeStickers} />

      <HeroSection orb1Y={orb1Y} orb2Y={orb2Y} />
      <AIFeaturesSection />
      <BehaviorLogicSection />
      <HomeProofSection />
      {stats && <StatsSection stats={stats} />}
      <CTASection />
    </div>
  );
}
