import { motion } from 'framer-motion';

export default function NeonInput({
  label,
  textarea = false,
  className = '',
  containerClass = '',
  ...props
}) {
  const inputClass = `input-neon ${className}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`mb-4 ${containerClass}`}
    >
      {label && (
        <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">
          {label}
        </label>
      )}
      {textarea ? (
        <textarea className={`${inputClass} min-h-[120px] resize-y`} {...props} />
      ) : (
        <input className={inputClass} {...props} />
      )}
    </motion.div>
  );
}
