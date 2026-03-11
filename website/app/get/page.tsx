"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

type Platform = "ios" | "android" | "rustore" | "unknown"

// Custom App Store Icons
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

const stores = {
  ios: {
    name: "App Store",
    icon: AppleIcon,
    url: "https://apps.apple.com/app/smartword",
    description: "Загрузить в App Store",
  },
  android: {
    name: "Google Play",
    icon: GooglePlayIcon,
    url: "https://play.google.com/store/apps/details?id=com.smartword",
    description: "Доступно в Google Play",
  },
  rustore: {
    name: "RuStore",
    icon: RuStoreIcon,
    url: "https://apps.rustore.ru/app/com.smartword",
    description: "Скачать из RuStore",
  },
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown"
  
  const userAgent = navigator.userAgent.toLowerCase()
  
  // Check for iOS
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios"
  }
  
  // Check for Android
  if (/android/.test(userAgent)) {
    // Could add RuStore detection based on locale/region if needed
    return "android"
  }
  
  return "unknown"
}

export default function SmartLinkPage() {
  const [platform, setPlatform] = useState<Platform>("unknown")
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const detected = detectPlatform()
    setPlatform(detected)

    // Auto-redirect after a short delay if platform is detected
    if (detected !== "unknown") {
      setIsRedirecting(true)
      const timer = setTimeout(() => {
        window.location.href = stores[detected].url
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [])

  const handleManualRedirect = (store: keyof typeof stores) => {
    window.location.href = stores[store].url
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-primary/5 px-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mb-8 inline-flex"
        >
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl">
            <span className="text-4xl font-bold text-white">S</span>
          </div>
        </motion.div>

        <h1 className="text-3xl font-bold mb-4">SmartWord</h1>
        
        {isRedirecting && platform !== "unknown" ? (
          <>
            <p className="text-muted-foreground mb-6">
              Перенаправляем в {stores[platform].name}...
            </p>
            <div className="flex justify-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Не перенаправляет?{" "}
              <button
                onClick={() => handleManualRedirect(platform)}
                className="text-primary hover:underline"
              >
                Нажмите здесь
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-8">
              Выберите магазин для загрузки SmartWord
            </p>

            <div className="flex flex-col gap-3">
              {Object.entries(stores).map(([key, store]) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => handleManualRedirect(key as keyof typeof stores)}
                  className="h-16 px-6 rounded-2xl glass-strong border-primary/20 hover:border-primary/40 hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 w-full">
                    <store.icon className="h-8 w-8" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{store.description}</p>
                      <p className="text-base font-semibold">{store.name}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Device info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Smartphone className="h-4 w-4" />
          <span>
            {platform === "unknown" 
              ? "Устройство не определено" 
              : `Определено: ${platform === "ios" ? "iOS" : platform === "android" ? "Android" : "RuStore"}`
            }
          </span>
        </motion.div>
      </motion.div>
    </main>
  )
}
