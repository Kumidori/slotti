import { useEffect, useRef } from 'react';
import '../styles/FloatNumber.css';

export default function FloatNumber({ text, type, targetRef }) {
  const elRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || !targetRef?.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    elRef.current.style.left = (rect.left + rect.width / 2 - 30 + (Math.random() * 40 - 20)) + 'px';
    elRef.current.style.top = (rect.top - 10) + 'px';
  }, [targetRef]);

  return (
    <div ref={elRef} className={`float-number ${type}`}>
      {text}
    </div>
  );
}
