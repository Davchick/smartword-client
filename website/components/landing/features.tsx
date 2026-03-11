"use client"

import { motion } from "framer-motion"
import { BookOpen, MessageCircle, Lightbulb, Brain } from "lucide-react"

const features = [
  {
    icon: BookOpen,
    title: "Личные словари",
    description: "Создавай тематические коллекции слов для любого языка. Твой холст, твои правила. Никакого готового контента — только твои слова.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: MessageCircle,
    title: "ИИ-диалоги",
    description: "Практикуйся с Lexi, используя слова из своего словаря. Настоящие разговоры, реальный прогресс, ощутимые результаты.",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    icon: Lightbulb,
    title: "Умные подсказки",
    description: "Получай переводы, варианты ответов и мягкие исправления прямо в чате. Учись естественно, без давления.",
    gradient: "from-teal-500 to-emerald-500",
  },
  {
    icon: Brain,
    title: "Интервальное повторение",
    description: "Наш алгоритм знает, когда ты вот-вот забудешь слово. Повторяй в идеальный момент для долгосрочного запоминания.",
    gradient: "from-emerald-500 to-cyan-500",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
}

export function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-sm font-medium text-primary mb-4">Почему SmartWord?</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Всё, что нужно для{" "}
            <span className="gradient-text">освоения языка</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty">
            Забудь о скучных карточках. SmartWord объединяет твой личный словарь 
            с ИИ-практикой для обучения, которое действительно работает.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative h-full glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                {/* Icon */}
                <div className={`mx-auto sm:mx-0 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} mb-3 sm:mb-5 shadow-lg`}>
                  <feature.icon className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-base sm:text-xl font-semibold mb-1.5 sm:mb-3 text-center sm:text-left">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center sm:text-left">{feature.description}</p>

                {/* Hover glow effect */}
                <div className={`absolute inset-0 -z-10 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
