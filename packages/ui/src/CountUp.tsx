import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

export interface CountUpProps {
  /** Valor final. */
  to: number;
  /** Valor inicial. Padrão: 0. */
  from?: number;
  /** Duração em segundos. Padrão: 0,9. */
  duration?: number;
  /** Texto antes do número (ex.: "+"). */
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Número que sobe como contador. Com "reduzir movimento", mostra o valor final direto. */
export function CountUp({ to, from = 0, duration = 0.9, prefix = '', suffix = '', className }: CountUpProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : from);

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to, duration, reduce]);

  return (
    <span className={className}>
      <span aria-hidden="true">
        {prefix}
        {value}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {to}
        {suffix}
      </span>
    </span>
  );
}
