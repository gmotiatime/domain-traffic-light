import { motion } from "framer-motion";
import React from "react";
import BorderGlow from "@/components/BorderGlow";

export function GlassCard({
  children,
  className = "",
  containerClassName = "",
  delay = 0,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  delay?: number;
  glow?: string;
}) {
  return (
    <motion.div
      className={`relative transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 ${containerClassName}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }} // Start from scale 0.95, not 0
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      viewport={{ once: true, amount: 0.1 }}
    >
      <BorderGlow
        className={`w-full h-full rounded-[2rem] border-white/5 shadow-2xl flex flex-col ${className}`}
        borderRadius={32}
        glowRadius={30}
        fillOpacity={0}
        backgroundColor="#000000"
      >
        <div style={glow ? { background: glow, height: '100%' } : { height: '100%' }}>
          {children}
        </div>
      </BorderGlow>
    </motion.div>
  );
}
