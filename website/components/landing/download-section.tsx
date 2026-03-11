"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, WifiOff, Cloud } from "lucide-react"

// Custom App Store Icons as SVG components
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.609 1.814L13.792 12 3.609 22.186c-.181-.085-.309-.265-.309-.479V2.293c0-.214.128-.394.309-.479zm10.831 10.469l2.534-2.534 3.219 1.857c.631.364.631 1.424 0 1.788l-3.219 1.857-2.534-2.534-.001-.434h.001zm-1.247 1.247l-9.18 9.18 12.61-7.278-3.43-1.902zm0-2.494l3.43-1.902-12.61-7.278 9.18 9.18z"/>
    </svg>
  )
}

function RuStoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-11h4v2h-4v-2zm0 4h4v2h-4v-2z"/>
      <path d="M9 7h6c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1H9c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1zm1 2v6h4V9h-4z"/>
    </svg>
  )
}

const stores = [
  {
    name: "App Store",
    subtitle: "Загрузить в",
    icon: AppleIcon,
    href: "#",
  },
  {
    name: "Google Play",
    subtitle: "Доступно в",
    icon: GooglePlayIcon,
    href: "#",
  },
  {
    name: "RuStore",
    subtitle: "Скачать из",
    icon: RuStoreIcon,
    href: "#",
  },
]

const features = [
  { label: "10 000+ пользователей", icon: Users },
  { label: "93% запоминают слова", icon: TrendingUp },
  { label: "Офлайн-режим", icon: WifiOff },
  { label: "Облачная синхронизация", icon: Cloud },
]

export function DownloadSection() {
  return (
    <section id="download" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-gradient-to-r from-primary/25 to-accent/25 blur-[180px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-balance">
            Начни изучать языки{" "}
            <span className="gradient-text">уже сегодня</span>
          </h2>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Скачай SmartWord бесплатно и открой самый персональный способ изучения языков. 
            Первые 7 дней премиум-функций — в подарок.
          </p>

          {/* Store Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            {stores.map((store, index) => (
              <motion.div
                key={store.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Button
                  asChild
                  variant="outline"
                  className="h-16 px-6 rounded-2xl glass-strong border-primary/20 hover:border-primary/40 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 w-full sm:w-auto"
                >
                  <a href={store.href} className="flex items-center gap-4">
                    <store.icon className="h-8 w-8" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{store.subtitle}</p>
                      <p className="text-base font-semibold">{store.name}</p>
                    </div>
                  </a>
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Smart Link Info */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <p className="text-sm text-muted-foreground">
              Или поделись ссылкой:{" "}
              <span className="font-mono text-primary font-medium">smartword.app/get</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Автоматически определит устройство и откроет нужный магазин
            </p>
          </motion.div>

          {/* Features reminder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6"
          >
            {features.map((item, index) => (
              <motion.div 
                key={item.label} 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="glass rounded-2xl p-4 flex flex-col items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
