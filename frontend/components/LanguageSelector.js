import { motion } from 'framer-motion';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇧🇩' },
  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
];

export default function LanguageSelector({
  value,
  onChange,
  label = 'Language',
  className = '',
  includeAll = false,
}) {
  const items = includeAll
    ? [{ code: '', name: 'All Languages', flag: '🌐' }, ...languages]
    : languages;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`mb-4 ${className}`}
    >
      {label && (
        <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="input-neon"
      >
        {items.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </motion.div>
  );
}
