import { motion } from "framer-motion";
import React from "react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

export function GlassCard({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
}) {
  return (
    <motion.div
      className={`group relative overflow-hidden rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] backdrop-blur-2xl transition-all duration-300 hover:bg-foreground/[0.04] hover:shadow-[0_0_60px_rgba(255,255,255,0.03)] hover:border-foreground/[0.1] ${className}`}
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.005 }}
      style={glow ? { background: glow } : undefined}
    >
      {/* top edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
      {children}
    </motion.div>
  );
}
