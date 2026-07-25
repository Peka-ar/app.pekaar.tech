"use client";
import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export default function OtpInput({ value, onChange, id = "otp" }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const otpDigits = value.replace(/\D/g, '').slice(0, 6);
    if (otpDigits !== value) {
      onChange(otpDigits);
    }
  }, [value, onChange]);

  const handleChange = (index: number, char: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    if (!/^\d*$/.test(char)) return;

    const newDigits = digits.split('');
    newDigits[index] = char;
    const newValue = newDigits.join('');

    onChange(newValue);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const digits = value.replace(/\D/g, '').split('');
      if (!digits[index] && index > 0) {
        digits.splice(index - 1, 1);
        onChange(digits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        digits.splice(index, 1);
        onChange(digits.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pastedData);
  };

  const digits = value.replace(/\D/g, '').split('');

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          id={`${id}-${index}`}
          aria-label={`Digit ${index + 1} of 6`}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="input-base w-12 h-12 text-center text-xl tracking-[0.25em] font-mono"
        />
      ))}
    </div>
  );
}