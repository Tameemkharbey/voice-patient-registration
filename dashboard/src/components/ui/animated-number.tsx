import { animate, useReducedMotion } from 'framer-motion';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';

type AnimatedNumberProps = {
  value: number;
  formatter?: (value: number) => string;
};

export const AnimatedNumber = ({ value, formatter }: AnimatedNumberProps): React.JSX.Element => {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    const controls = animate(prevRef.current, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    prevRef.current = value;
    return () => controls.stop();
  }, [value, reducedMotion]);

  const rounded = Math.round(display);
  return <>{formatter ? formatter(rounded) : rounded.toLocaleString()}</>;
};
