"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

const weekData = [
  { day: "Пн", words: 12, reviewed: 45 },
  { day: "Вт", words: 18, reviewed: 62 },
  { day: "Ср", words: 8, reviewed: 38 },
  { day: "Чт", words: 22, reviewed: 75 },
  { day: "Пт", words: 15, reviewed: 55 },
  { day: "Сб", words: 28, reviewed: 89 },
  { day: "Вс", words: 20, reviewed: 70 },
]

// Calculate cumulative progress for the curve
const maxProgress = 100
const progressPoints = weekData.map((_, i) => {
  const progress = Math.min(((i + 1) / weekData.length) * 100 * 1.15, maxProgress)
  return progress
})

export function ProgressCurve() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  // SVG path for smooth curve
  const width = 320
  const height = 140
  const padding = 20

  // Create smooth curve points
  const points = progressPoints.map((progress, i) => ({
    x: padding + (i * (width - 2 * padding)) / (progressPoints.length - 1),
    y: height - padding - (progress / 100) * (height - 2 * padding),
  }))

  // Generate smooth curve path using cubic bezier
  const generatePath = () => {
    if (points.length < 2) return ""
    
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const controlX = (current.x + next.x) / 2
      
      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
    }
    
    return path
  }

  // Generate gradient fill path
  const generateFillPath = () => {
    const linePath = generatePath()
    const lastPoint = points[points.length - 1]
    const firstPoint = points[0]
    
    return `${linePath} L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="glass rounded-3xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-lg">Прогресс за неделю</h4>
          <p className="text-sm text-muted-foreground">Кривая обучения</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold gradient-text">+123</p>
          <p className="text-xs text-muted-foreground">новых слов</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="oklch(0.55 0.2 230)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(0.7 0.15 180)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.55 0.2 230)" />
              <stop offset="100%" stopColor="oklch(0.7 0.15 180)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = height - padding - (percent / 100) * (height - 2 * padding)
            return (
              <line
                key={percent}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4 4"
              />
            )
          })}

          {/* Animated fill */}
          <motion.path
            d={generateFillPath()}
            fill="url(#curveGradient)"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          />

          {/* Animated curve line */}
          <motion.path
            d={generatePath()}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
          />

          {/* Data points */}
          {points.map((point, i) => (
            <motion.g key={i}>
              {/* Outer glow */}
              <motion.circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="url(#lineGradient)"
                fillOpacity="0.2"
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              />
              {/* Inner point */}
              <motion.circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="url(#lineGradient)"
                stroke="white"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.3, type: "spring" }}
              />
            </motion.g>
          ))}
        </svg>

        {/* Day labels */}
        <div className="flex justify-between px-2 mt-2">
          {weekData.map((item, i) => (
            <motion.div
              key={item.day}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.8 + i * 0.05 }}
              className="text-center"
            >
              <p className="text-xs font-medium text-muted-foreground">{item.day}</p>
              <p className="text-[10px] text-primary font-semibold">+{item.words}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 1.2 }}
        className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/50"
      >
        <div className="text-center">
          <p className="text-lg font-bold">434</p>
          <p className="text-xs text-muted-foreground">повторений</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold gradient-text">87%</p>
          <p className="text-xs text-muted-foreground">точность</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">7</p>
          <p className="text-xs text-muted-foreground">дней подряд</p>
        </div>
      </motion.div>
    </motion.div>
  )
}
