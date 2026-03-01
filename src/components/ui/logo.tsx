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
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Tech Hexagon */}
        <motion.path
          d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary/20"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Outer Spinning Accent Array */}
        <motion.path
          d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="40 160"
          className="text-primary"
          initial={{ pathOffset: 0 }}
          animate={{ pathOffset: 200 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner Data Polygon - The 'Insight' Core */}
        <motion.path
          d="M50 25 L70 40 L50 75 L30 50 Z"
          fill="currentColor"
          className="text-primary/80"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.5,
            type: "spring",
            stiffness: 100,
          }}
          style={{ transformOrigin: "50px 50px" }}
        />

        {/* Floating Data Nodes */}
        {[
          { cx: 50, cy: 25, delay: 0.8 },
          { cx: 70, cy: 40, delay: 1.0 },
          { cx: 50, cy: 75, delay: 1.2 },
          { cx: 30, cy: 50, delay: 1.4 },
        ].map((node, i) => (
          <motion.circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r="7"
            fill="currentColor"
            className="text-primary"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: node.delay, type: "spring" }}
          />
        ))}

        {/* Neural Network Connection Lines */}
        {[
          { x2: 50, y2: 25, delay: 1.0 },
          { x2: 70, y2: 40, delay: 1.2 },
          { x2: 50, y2: 75, delay: 1.4 },
          { x2: 30, y2: 50, delay: 1.6 },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1="50"
            y1="50"
            x2={line.x2}
            y2={line.y2}
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-70"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: line.delay, ease: "easeOut" }}
          />
        ))}

        {/* Pulsing Core Center */}
        <motion.circle
          cx="50"
          cy="50"
          r="6"
          fill="white"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, delay: 1.8 }}
        />
      </svg>
    </motion.div>
  );
}
