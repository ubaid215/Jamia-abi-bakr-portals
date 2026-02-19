/* eslint-disable no-unused-vars */
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Animated Counter Hook ──────────────────────────────────
function useAnimatedValue(target, duration = 800) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (target === 0 || target === undefined || target === null) {
            setValue(0);
            return;
        }

        const start = performance.now();
        const startVal = 0;

        const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(startVal + (target - startVal) * eased));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [target, duration]);

    return value;
}

// ─── Mini Sparkline SVG ─────────────────────────────────────
const Sparkline = React.memo(({ data, color = '#3B82F6', height = 32, width = 80 }) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);

    const points = data.map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <polygon
                points={areaPoints}
                fill={`url(#spark-${color.replace('#', '')})`}
            />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});
Sparkline.displayName = 'Sparkline';

// ─── Stat Card Component ────────────────────────────────────
const StatCard = React.memo(({
    icon: Icon,
    title,
    value,
    suffix = '',
    change,
    changeLabel,
    sparkData,
    sparkColor,
    onClick,
    color = 'blue',
}) => {
    const animatedValue = useAnimatedValue(typeof value === 'number' ? value : 0);

    const displayValue = typeof value === 'number'
        ? animatedValue.toLocaleString()
        : value;

    const trend = useMemo(() => {
        if (change === undefined || change === null) return 'neutral';
        if (typeof change === 'number') return change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
        return 'neutral';
    }, [change]);

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

    const trendColors = {
        up: 'text-emerald-600 bg-emerald-50',
        down: 'text-red-600 bg-red-50',
        neutral: 'text-gray-500 bg-gray-50',
    };

    return (
        <div
            onClick={onClick}
            className={`
                group relative w-full h-full
                bg-white/80 backdrop-blur-xl
                rounded-xl sm:rounded-2xl
                p-4 sm:p-5 lg:p-6
                border border-white/20
                shadow-sm hover:shadow-lg
                transition-all duration-300
                hover:-translate-y-0.5
                flex flex-col
                ${onClick ? 'cursor-pointer' : ''}
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    {title}
                </span>
                <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                </div>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1 mb-2">
                <span className="
                    text-xl 
                    sm:text-2xl 
                    lg:text-3xl 
                    font-bold 
                    text-gray-900 
                    tabular-nums 
                    tracking-tight
                ">
                    {displayValue}
                </span>
                {suffix && (
                    <span className="text-xs sm:text-sm font-medium text-gray-500">
                        {suffix}
                    </span>
                )}
            </div>

            {/* Change */}
            {change !== undefined && change !== null && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className={`
                        inline-flex items-center gap-1
                        px-2 py-0.5
                        rounded-full text-[10px] sm:text-xs
                        font-semibold
                        ${trendColors[trend]}
                    `}>
                        <TrendIcon className="h-3 w-3" />
                        {typeof change === 'number' ? `${Math.abs(change)}%` : change}
                    </span>
                    {changeLabel && (
                        <span className="text-[10px] sm:text-xs text-gray-400">
                            {changeLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Sparkline */}
            {sparkData && sparkData.length > 1 && (
                <div className="mt-auto pt-2">
                    <Sparkline
                        data={sparkData}
                        color={sparkColor || (trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280')}
                    />
                </div>
            )}

            {/* Click Arrow */}
            {onClick && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            )}
        </div>
    );
});

StatCard.displayName = 'StatCard';

export default StatCard;
// eslint-disable-next-line react-refresh/only-export-components
export { Sparkline, useAnimatedValue };
