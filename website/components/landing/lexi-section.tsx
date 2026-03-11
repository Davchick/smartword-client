"use client"

import { motion } from "framer-motion"
import { Sparkles, MessageSquare, Languages, Zap } from "lucide-react"
import { IPhoneMockup, AppScreenChat } from "./iphone-mockup"

const capabilities = [
  {
    icon: MessageSquare,
    title: "Живые диалоги",
    description: "Общайся на любые темы, используя слова из своего словаря",
  },
  {
    icon: Languages,
    title: "Любая языковая пара",
    description: "Учи английский, испанский, французский, немецкий или любой другой язык",
  },
  {
    icon: Zap,
    title: "Мгновенная обратная связь",
    description: "Получай исправления и подсказки в реальном времени",
  },
]

export function LexiSection() {
  return (
    <section id="lexi" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-1/4 right-0 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 left-0 h-[400px] w-[400px] rounded-full bg-accent/15 blur-[100px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Phone Mockup */}
          <div className="order-2 lg:order-1 relative flex justify-center">
            {/* Decorative elements */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="h-[350px] w-[350px] sm:h-[400px] sm:w-[400px] rounded-full border border-primary/20 border-dashed" />
            </motion.div>
            
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="h-[420px] w-[420px] sm:h-[480px] sm:w-[480px] rounded-full border border-accent/10 border-dashed" />
            </motion.div>

            <IPhoneMockup>
              <AppScreenChat />
            </IPhoneMockup>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Твой собеседник</span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-balance">
              Знакомься: <span className="gradient-text">Lexi</span> — твой личный языковой компаньон
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Lexi — это больше, чем чат-бот. Она адаптируется к твоему уровню словарного запаса, 
              запоминает твои слова и помогает использовать их в реальных разговорах. 
              Представь терпеливую подругу, которая свободно говорит на любом языке.
            </p>

            {/* Capabilities */}
            <div className="space-y-4">
              {capabilities.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4 glass rounded-2xl p-4"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { value: "50+", label: "Языков" },
                { value: "24/7", label: "Доступна" },
                { value: "∞", label: "Терпения" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <p className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
