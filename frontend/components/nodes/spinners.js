'use client';

const SPINNERS = {
  lyrics: { emoji: '\u270D\uFE0F', name: 'writeAnim' },
  music: { emoji: '\uD83C\uDFB5', name: 'bounceAnim' },
  cover: { emoji: '\uD83C\uDFA4', name: 'pulseAnim' },
  tts: { emoji: '\uD83D\uDDE3\uFE0F', name: 'waveAnim' },
  prompt: { emoji: '\u2728', name: 'spinAnim' },
  video: { emoji: '\uD83C\uDFAC', name: 'flipAnim' },
  image: { emoji: '\uD83C\uDFA8', name: 'bobAnim' },
};

const keyframes = `
@keyframes writeAnim {
  0%, 100% { transform: rotate(-12deg) scale(1); opacity: 0.5; }
  50% { transform: rotate(8deg) scale(1.1); opacity: 1; }
}
@keyframes bounceAnim {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
  60% { transform: translateY(-3px); }
}
@keyframes pulseAnim {
  0%, 100% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}
@keyframes waveAnim {
  0%, 100% { transform: translateX(-5px) scale(1); }
  50% { transform: translateX(5px) scale(1.05); }
}
@keyframes spinAnim {
  0% { transform: rotate(0deg) scale(0.8); opacity: 0.3; }
  50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
  100% { transform: rotate(360deg) scale(0.8); opacity: 0.3; }
}
@keyframes flipAnim {
  0%, 100% { transform: rotateY(0deg) scaleX(1); }
  50% { transform: rotateY(180deg) scaleX(1.2); }
}
@keyframes bobAnim {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-5px) rotate(4deg); }
}
`;

export default function NodeSpinner({ variant = 'lyrics', size = 36 }) {
  const def = SPINNERS[variant] || SPINNERS.lyrics;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15,5,30,0.45)',
          borderRadius: 8,
          zIndex: 5,
          backdropFilter: 'blur(2px)',
        }}
      >
        <span
          style={{
            fontSize: size,
            lineHeight: 1,
            animation: `${def.name} 1.2s ease-in-out infinite`,
            display: 'inline-block',
          }}
        >
          {def.emoji}
        </span>
      </div>
    </>
  );
}
