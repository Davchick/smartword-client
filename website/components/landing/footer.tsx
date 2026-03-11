"use client"

import { motion } from "framer-motion"

const footerLinks = {
  "Продукт": [
    { label: "Возможности", href: "#features" },
    { label: "Тренировки", href: "#training" },
    { label: "Тарифы", href: "#" },
    { label: "FAQ", href: "#" },
  ],
  "Компания": [
    { label: "О нас", href: "#" },
    { label: "Блог", href: "#" },
    { label: "Вакансии", href: "#" },
    { label: "Контакты", href: "#" },
  ],
  "Документы": [
    { label: "Политика конфиденциальности", href: "#" },
    { label: "Условия использования", href: "#" },
    { label: "Cookies", href: "#" },
  ],
  "Соцсети": [
    { label: "Telegram", href: "#" },
    { label: "VK", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <motion.a
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              href="#"
              className="flex items-center gap-2 mb-4"
            >
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-lg font-bold text-white">S</span>
              </div>
              <span className="text-xl font-semibold">SmartWord</span>
            </motion.a>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Самый умный способ учить и запоминать новые слова навсегда.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * categoryIndex }}
            >
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} SmartWord. Все права защищены.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Сделано с</span>
            <span className="gradient-text font-semibold">любовью</span>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
