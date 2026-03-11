"use client"

import { motion } from "framer-motion"

interface IPhoneMockupProps {
  children: React.ReactNode
  className?: string
}

export function IPhoneMockup({ children, className = "" }: IPhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative ${className}`}
    >
      {/* Phone Frame */}
      <div className="relative mx-auto w-[280px] sm:w-[320px]">
        {/* Outer frame */}
        <div className="relative rounded-[3rem] bg-gradient-to-b from-zinc-700 to-zinc-900 p-[3px] shadow-2xl dark:from-zinc-600 dark:to-zinc-800">
          {/* Inner frame */}
          <div className="rounded-[2.8rem] bg-zinc-900 p-2">
            {/* Screen bezel */}
            <div className="relative overflow-hidden rounded-[2.4rem] bg-background">
              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                <div className="h-[28px] w-[100px] rounded-full bg-zinc-900" />
              </div>
              
              {/* Screen Content */}
              <div className="relative aspect-[9/19.5] overflow-hidden">
                {children}
              </div>
            </div>
          </div>
        </div>
        
        {/* Side button (right) */}
        <div className="absolute right-[-3px] top-[120px] h-[60px] w-[3px] rounded-r-sm bg-zinc-700 dark:bg-zinc-600" />
        
        {/* Volume buttons (left) */}
        <div className="absolute left-[-3px] top-[100px] h-[30px] w-[3px] rounded-l-sm bg-zinc-700 dark:bg-zinc-600" />
        <div className="absolute left-[-3px] top-[140px] h-[50px] w-[3px] rounded-l-sm bg-zinc-700 dark:bg-zinc-600" />
        <div className="absolute left-[-3px] top-[200px] h-[50px] w-[3px] rounded-l-sm bg-zinc-700 dark:bg-zinc-600" />
      </div>
    </motion.div>
  )
}

export function AppScreenChat() {
  return (
    <div className="h-full w-full bg-gradient-to-b from-primary/10 to-accent/10 p-4 pt-12">
      {/* App Header */}
      <div className="mb-4 text-center">
        <p className="text-xs text-muted-foreground">Диалог с</p>
        <p className="font-semibold gradient-text">Lexi</p>
      </div>
      
      {/* Chat Messages */}
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground"
        >
          Как сказать «красивый» по-испански?
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="max-w-[80%] glass rounded-2xl rounded-bl-sm px-3 py-2 text-xs"
        >
          <p className="font-medium">hermoso / hermosa</p>
          <p className="mt-1 text-muted-foreground">«Hermoso» для мужского рода, «hermosa» — для женского.</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9 }}
          className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground"
        >
          El cielo es muy hermoso hoy
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2 }}
          className="max-w-[80%] glass rounded-2xl rounded-bl-sm px-3 py-2 text-xs"
        >
          <p className="text-accent font-medium">Отлично!</p>
          <p className="mt-1 text-muted-foreground">Прекрасное использование нового слова!</p>
        </motion.div>
      </div>
      
      {/* Input Area */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="flex items-center gap-2 rounded-full glass-strong px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-muted-foreground">Напиши сообщение...</span>
        </div>
      </div>
    </div>
  )
}

export function AppScreenDictionary() {
  const words = [
    { word: "Serendipity", translation: "Счастливая случайность", lang: "EN → RU" },
    { word: "Wanderlust", translation: "Страсть к путешествиям", lang: "DE → RU" },
    { word: "Saudade", translation: "Тоска по прошлому", lang: "PT → RU" },
  ]

  return (
    <div className="h-full w-full bg-gradient-to-b from-accent/10 to-primary/10 p-4 pt-12">
      {/* App Header */}
      <div className="mb-4">
        <p className="text-lg font-semibold">Мои словари</p>
        <p className="text-xs text-muted-foreground">3 коллекции</p>
      </div>
      
      {/* Dictionary Cards */}
      <div className="space-y-2">
        {words.map((item, index) => (
          <motion.div
            key={item.word}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.15 }}
            className="glass rounded-xl p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{item.word}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.translation}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {item.lang}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Add Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-6 right-4"
      >
        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-lg">
          <span className="text-2xl text-white">+</span>
        </div>
      </motion.div>
    </div>
  )
}

export function AppScreenTraining() {
  return (
    <div className="h-full w-full bg-gradient-to-b from-primary/5 to-accent/5 p-4 pt-12">
      {/* App Header */}
      <div className="mb-4 text-center">
        <p className="text-lg font-semibold">Тренировка</p>
        <p className="text-xs text-muted-foreground">Свайп-карточки</p>
      </div>
      
      {/* Card Stack */}
      <div className="relative mx-auto mt-6 w-full max-w-[200px]">
        {/* Background cards */}
        <div className="absolute top-4 left-2 right-2 h-32 rounded-2xl bg-muted/50 transform rotate-[-4deg]" />
        <div className="absolute top-2 left-1 right-1 h-32 rounded-2xl bg-muted/70 transform rotate-[-2deg]" />
        
        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="relative glass-strong rounded-2xl p-4 text-center"
        >
          <p className="text-2xl font-bold gradient-text mb-2">Ephemeral</p>
          <div className="h-px bg-border my-3" />
          <p className="text-sm text-muted-foreground">Нажми для перевода</p>
        </motion.div>
      </div>
      
      {/* Swipe Indicators */}
      <div className="flex items-center justify-center gap-8 mt-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-500 text-lg">←</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Ещё учу</span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <span className="text-green-500 text-lg">→</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Знаю!</span>
        </motion.div>
      </div>
      
      {/* Progress */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Прогресс</span>
          <span>12/25</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "48%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
      </div>
    </div>
  )
}
