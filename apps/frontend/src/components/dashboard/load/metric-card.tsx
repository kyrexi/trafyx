interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    suffix?: string;
    variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
    size?: 'sm' | 'md';
}

export default function MetricCard({ 
    icon, 
    label, 
    value, 
    suffix = '', 
    variant = 'default',
    size = 'md'
}: MetricCardProps) {
    const variants = {
        default: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400',
        primary: 'bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/40 text-primary dark:text-primary',
        success: 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800/50 text-green-600 dark:text-green-400',
        danger: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400',
        warning: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400',
    };

    const textVariants = {
        default: 'text-gray-900 dark:text-gray-100',
        primary: 'text-primary dark:text-primary',
        success: 'text-green-900 dark:text-green-100',
        danger: 'text-red-900 dark:text-red-100',
        warning: 'text-orange-900 dark:text-orange-100',
    };

    const sizes = {
        sm: { container: 'p-3', text: 'text-lg', suffix: 'text-xs' },
        md: { container: 'p-4', text: 'text-2xl', suffix: 'text-sm' },
    };

    return (
        <div className={`${variants[variant]} ${sizes[size].container} rounded-lg border`}>
            {icon && (
                <div className={`flex items-center gap-2 mb-1`}>
                    {icon}
                    <span className="text-sm font-medium">{label}</span>
                </div>
            )}
            {!icon && (
                <div className="text-xs mb-1">{label}</div>
            )}
            <div className={`${sizes[size].text} font-bold ${textVariants[variant]}`}>
                {value}
                {suffix && <span className={sizes[size].suffix}>{suffix}</span>}
            </div>
        </div>
    );
}
