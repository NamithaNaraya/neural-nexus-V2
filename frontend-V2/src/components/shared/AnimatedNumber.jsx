import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export function AnimatedNumber({ value, suffix = '', prefix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const num = typeof value === 'number' ? value : parseInt(value) || 0;
    if (num === 0) {
      setDisplayValue(0);
      return;
    }

    let raf;
    const startTime = performance.now();
    const duration = 800;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(num * eased));

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}
