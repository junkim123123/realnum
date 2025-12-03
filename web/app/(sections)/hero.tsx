"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import LogisticsMap from "./logistics-map";

export default function Hero() {
  const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20, duration: 0.6 } },
  };

  return (
    <motion.section
      initial="hidden"
      animate="show"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="relative w-full overflow-hidden bg-background min-h-[85vh] flex items-center"
    >
      {/* Background Grid & Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-white opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Text Content */}
          <motion.div
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="relative z-10 text-center lg:text-left"
          >
            <div className="relative bg-gradient-to-r from-background via-background/90 to-transparent lg:from-transparent lg:via-transparent lg:to-transparent -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 py-8">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-full glass border-subtle-border px-4 py-1.5 hover:border-highlight-border transition-colors duration-300">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_theme(colors.primary.DEFAULT)]" />
                <span className="text-badge text-primary">AI-Powered Global Sourcing</span>
              </div>

              {/* Main Headline */}
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.1]">
                Instant landed cost and risk reports for your next import
              </h1>

              {/* Subheadline */}
              <p className="mb-8 max-w-2xl mx-auto lg:mx-0 text-lg text-muted-foreground sm:text-xl leading-relaxed">
                Paste a product idea, link, or photo and NexSupply estimates freight, duty, and sourcing risk so you stop guessing and start importing with confidence.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <a
                  href="/copilot"
                  className="group relative inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-black transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_24px_-4px_theme(colors.primary.DEFAULT)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  Start a free analysis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Globe */}
          <motion.div
            variants={FADE_UP_ANIMATION_VARIANTS}
            className="relative w-full h-[320px] sm:h-[380px] lg:h-[460px] mt-10 lg:mt-0"
          >
            <div className="absolute -inset-8 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.1),transparent_70%)]" />
            <LogisticsMap />
          </motion.div>
          
        </div>
      </div>
    </motion.section>
  );
}