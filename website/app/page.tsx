"use client"

import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { LexiSection } from "@/components/landing/lexi-section"
import { TrainingSection } from "@/components/landing/training-section"
import { DownloadSection } from "@/components/landing/download-section"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Header />
      <Hero />
      <Features />
      <LexiSection />
      <TrainingSection />
      <DownloadSection />
      <Footer />
    </main>
  )
}
