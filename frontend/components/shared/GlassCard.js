import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  glow = 'purple',
  hover = true,
  padding = true,
  style = {},
  ...props
}) {
  const glowClasses = {
    purple: 'hover:border-[#b026ff]',
    pink: 'hover:border-[#ff3bd4] neon-border-pink',
    blue: 'hover:border-[#63d4ff] neon-border-blue',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`
        glass rounded-2xl
        ${hover ? 'transition-all duration-300' : ''}
        ${glowClasses[glow] || glowClasses.purple}
        ${padding ? 'p-6 md:p-8' : ''}
        ${className}
      `}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}
