import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  { id: 1, label: 'Generating Audio', icon: '🎵' },
  { id: 2, label: 'Creating Concepts', icon: '📝' },
  { id: 3, label: 'Rendering Video', icon: '🎬' },
  { id: 4, label: 'Assembling Final', icon: '✨' },
];

export default function ProgressTracker({ currentStep = 0, status = '' }) {
  return (
    <div className="w-full py-8">
      <div className="relative flex items-center justify-between">
        {/* Progress line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-[rgba(176,38,255,0.2)]">
          <motion.div
            className="h-full bg-gradient-to-r from-[#b026ff] via-[#ff3bd4] to-[#63d4ff]"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="relative flex flex-col items-center z-10">
              <motion.div
                animate={{
                  scale: isCurrent ? [1, 1.2, 1] : 1,
                  boxShadow: isCurrent
                    ? [
                        '0 0 10px rgba(176,38,255,0.5)',
                        '0 0 25px rgba(176,38,255,0.8)',
                        '0 0 10px rgba(176,38,255,0.5)',
                      ]
                    : isCompleted
                    ? '0 0 15px rgba(99,212,255,0.5)'
                    : 'none',
                }}
                transition={{
                  duration: isCurrent ? 2 : 0.5,
                  repeat: isCurrent ? Infinity : 0,
                }}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-lg
                  transition-all duration-300
                  ${isCompleted
                    ? 'bg-[#63d4ff] text-[#05010d] shadow-[0_0_15px_rgba(99,212,255,0.5)]'
                    : isCurrent
                    ? 'bg-[#b026ff] text-white shadow-[0_0_20px_rgba(176,38,255,0.6)]'
                    : 'glass text-[#b9b4d0]'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon
                )}
              </motion.div>
              <span className={`
                mt-2 text-xs font-medium tracking-wide whitespace-nowrap
                ${isCurrent ? 'text-[#b026ff]' : isCompleted ? 'text-[#63d4ff]' : 'text-[#b9b4d0]'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {status && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mt-6 text-sm text-[#b9b4d0]"
          >
            {status}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
