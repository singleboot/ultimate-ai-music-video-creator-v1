import { motion } from 'framer-motion';

export default function GlowButton({
  children,
  onClick,
  color = 'purple',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  pulse = false,
  fullWidth = false,
  ...props
}) {
  const colorClasses = {
    purple: 'bg-[#b026ff] hover:bg-[#8a1fcc] text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:shadow-[0_0_35px_rgba(176,38,255,0.6)]',
    pink: 'bg-[#ff3bd4] hover:bg-[#cc2fa9] text-white shadow-[0_0_20px_rgba(255,59,212,0.4)] hover:shadow-[0_0_35px_rgba(255,59,212,0.6)]',
    blue: 'bg-[#63d4ff] hover:bg-[#4fa9cc] text-[#05010d] shadow-[0_0_20px_rgba(99,212,255,0.4)] hover:shadow-[0_0_35px_rgba(99,212,255,0.6)]',
    gradient: 'bg-gradient-to-r from-[#b026ff] via-[#ff3bd4] to-[#63d4ff] hover:from-[#8a1fcc] hover:via-[#cc2fa9] hover:to-[#4fa9cc] text-white shadow-[0_0_25px_rgba(176,38,255,0.5)] hover:shadow-[0_0_40px_rgba(176,38,255,0.7)]',
  };

  const sizeClasses = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-8 py-3 text-base',
    lg: 'px-12 py-4 text-lg',
    xl: 'px-16 py-5 text-xl',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`
        relative overflow-hidden rounded-xl font-semibold tracking-wider
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colorClasses[color] || colorClasses.purple}
        ${sizeClasses[size] || sizeClasses.md}
        ${fullWidth ? 'w-full' : ''}
        ${pulse && !disabled ? 'animate-glow-pulse' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-xl">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {children}
      </span>
    </motion.button>
  );
}
