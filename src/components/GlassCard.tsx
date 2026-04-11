import { motion } from "framer-motion";
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
      className={`group relative transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 ${containerClassName}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      viewport={{ once: true, amount: 0.1 }}
    >
      <BorderGlow
        className={`w-full h-full rounded-[2rem] border-foreground/[0.06] shadow-2xl flex flex-col transition-colors duration-300 hover:border-foreground/[0.1] hover:shadow-[0_0_60px_rgba(255,255,255,0.03)] ${className}`}
        borderRadius={32}
        glowRadius={30}
        fillOpacity={0}
        backgroundColor="transparent"
      >
        <div className="absolute inset-0 rounded-[inherit] bg-foreground/[0.02] backdrop-blur-2xl transition-colors duration-300 group-hover:bg-foreground/[0.04] -z-10" />
        {/* top edge highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100 z-10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/[0.03] to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 z-10" />

        <div className="relative z-20" style={glow ? { background: glow, height: '100%' } : { height: '100%' }}>
          {children}
        </div>
      </BorderGlow>
    </motion.div>
  );
}
