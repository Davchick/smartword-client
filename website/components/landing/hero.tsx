"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IPhoneMockup, AppScreenChat } from "./iphone-mockup"

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-24 pb-16 lg:pt-32">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/25 blur-[150px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-accent/25 blur-[130px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-gradient-to-r from-primary/15 to-accent/15 blur-[180px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Умное обучение</span>
            </motion.div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] text-balance">
              Твои слова.{" "}
              <span className="gradient-text">Твой язык.</span>{" "}
              Твой путь.
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 text-pretty">
              Создавай личные словари и практикуйся с Lexi — твоим ИИ-собеседником. 
              Слова, которые ты добавляешь сам, остаются в памяти навсегда.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 transition-all text-white border-0 text-base px-8 h-14 shadow-lg shadow-primary/25"
              >
                <a href="#download">
                  Скачать бесплатно
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full glass text-base px-8 h-14 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <a href="#features">
                  Как это работает
                </a>
              </Button>
            </div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex items-center gap-6 justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-accent/60 shadow-sm"
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">10 000+</span> пользователей
              </div>
            </motion.div>
          </motion.div>

          {/* Phone Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 lg:left-8 glass rounded-2xl px-4 py-3 shadow-xl z-10"
            >
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                  <span className="text-white text-sm font-medium">AI</span>
                </div>
                <div>
                  <p className="text-xs font-medium">Lexi печатает...</p>
                  <p className="text-[10px] text-muted-foreground">ИИ-собеседник</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -right-4 lg:right-12 glass rounded-2xl px-4 py-3 shadow-xl z-10"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">7</span>
                </div>
                <div>
                  <p className="text-xs font-medium">Серия дней</p>
                  <p className="text-lg font-bold gradient-text">подряд</p>
                </div>
              </div>
            </motion.div>

            <IPhoneMockup>
              <AppScreenChat />
            </IPhoneMockup>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs">Листайте вниз</span>
          <div className="h-10 w-6 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center pt-2">
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-2 w-1 rounded-full bg-muted-foreground"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
