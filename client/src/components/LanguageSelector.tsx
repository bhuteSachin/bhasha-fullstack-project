import { ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { code: string; name: string }[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ label, value, onChange, options }) => {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-dark-muted text-sm font-medium ml-1">{label}</label>
            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-dark-input/50 border border-white/10 rounded-lg px-4 py-3 appearance-none focus:outline-none focus:border-primary-500/50 focus:shadow-lg focus:shadow-primary-500/10 transition-all duration-200 text-white cursor-pointer hover:bg-dark-input/80"
                >
                    {options.map((opt) => (
                        <option key={opt.code} value={opt.code} className="bg-dark-card text-white">
                            {opt.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted pointer-events-none group-hover:text-primary-400 transition-colors" />
            </div>
        </div>
    );
};
