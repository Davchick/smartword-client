"use client"

import { motion } from "framer-motion"
import { Layers, Keyboard, RefreshCw } from "lucide-react"
import { IPhoneMockup, AppScreenTraining, AppScreenDictionary } from "./iphone-mockup"
import { ProgressCurve } from "./progress-curve"

const trainingModes = [
  {
    icon: Layers,
    title: "Свайп-карточки",
    description: "Классические карточки с современным подходом. Свайпни вправо, если знаешь, влево — если нужно повторить.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Keyboard,
    title: "Пиши слова по памяти",
    description: "Проверь написание, набирая слова по памяти. Идеально для запоминания сложных слов.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: RefreshCw,
    title: "Интервальное повторение",
    description: "Умный алгоритм планирует повторения в оптимальные моменты для долгосрочного запоминания.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
]

export function TrainingSection() {
  return (
    <section id="training" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />
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
          <span className="inline-block text-sm font-medium text-primary mb-4">Режимы тренировок</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            Разные способы{" "}
            <span className="gradient-text">запомнить слова</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty">
            Все учатся по-разному. Выбирай режимы тренировок под свой стиль 
            и наблюдай, как твой словарный запас растёт экспоненциально.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Training Modes List */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {trainingModes.map((mode, index) => (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="group relative glass rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-start gap-5">
                  <div className={`flex-shrink-0 h-14 w-14 rounded-2xl ${mode.bg} flex items-center justify-center`}>
                    <mode.icon className={`h-7 w-7 ${mode.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{mode.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{mode.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Progress Curve */}
            <ProgressCurve />
          </motion.div>

          {/* Phone Mockups */}
          <div className="relative flex justify-center items-center">
            {/* Background phone */}
            <div className="absolute left-0 sm:left-8 top-1/2 -translate-y-1/2 transform rotate-[-8deg] opacity-60 scale-90 hidden sm:block">
              <IPhoneMockup>
                <AppScreenDictionary />
              </IPhoneMockup>
            </div>
            
            {/* Main phone */}
            <div className="relative z-10">
              <IPhoneMockup>
                <AppScreenTraining />
              </IPhoneMockup>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
