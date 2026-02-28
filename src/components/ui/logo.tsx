"use client";

import { motion } from "framer-motion";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Track / Background Ring */}
        <circle
          cx="16"
          cy="16"
          r="14"
          className="stroke-primary/20"
          strokeWidth="3"
        />

        {/* Animated Spin Ring */}
        <motion.circle
          cx="16"
          cy="16"
          r="14"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="90"
          initial={{ strokeDashoffset: 90 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "center", rotate: -90 }}
        />

        {/* Inner Bars / Analytics Visual */}
        <motion.rect
          x="10"
          y="18"
          width="3"
          height="6"
          rx="1"
          className="fill-primary"
          initial={{ height: 0, y: 24 }}
          animate={{ height: 6, y: 18 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        />
        <motion.rect
          x="15"
          y="14"
          width="3"
          height="10"
          rx="1"
          className="fill-primary"
          initial={{ height: 0, y: 24 }}
          animate={{ height: 10, y: 14 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        />
        <motion.rect
          x="20"
          y="10"
          width="3"
          height="14"
          rx="1"
          className="fill-primary/70"
          initial={{ height: 0, y: 24 }}
          animate={{ height: 14, y: 10 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}
