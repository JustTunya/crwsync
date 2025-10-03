"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon } from '@hugeicons/core-free-icons';
import { sendVerificationEmail } from '@/services/auth.service';

interface SignupStep3Props {
  email: string;
  userId: string;
}

export default function SignupStep3({ email, userId }: SignupStep3Props) {
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = () => {
    if (cooldown > 0) return;
    sendVerificationEmail(email, userId);
    setCooldown(60);
  }

  const emailProviders: Record<string, string> = {
    'gmail.com': 'https://mail.google.com',
    'yahoo.com': 'https://mail.yahoo.com',
    'outlook.com': 'https://outlook.live.com',
    'hotmail.com': 'https://outlook.live.com',
    'aol.com': 'https://mail.aol.com',
    'icloud.com': 'https://www.icloud.com/mail',
    'protonmail.com': 'https://mail.proton.me',
    'zoho.com': 'https://mail.zoho.com',
  };

  const openMailbox = () => {
    if (!email || !email.includes('@')) return;

    const domain = email.split('@')[1];
    const url = emailProviders[domain] || `https://www.${domain}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl text-center font-medium">You are ready to go!<br/>Check your email to begin.</h1>

      <p className="text-sm text-center text-muted-foreground font-light">Please check your email &apos;<span className="text-primary font-medium">{email}</span>&apos; and click the link inside to verify your account.</p>

      <Button onClick={openMailbox} variant="outline" type="button" className="w-full">
        <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={2} />
        Open mailbox
      </Button>

      {cooldown > 0 ? (
        <div className="text-center text-xs sm:text-sm text-muted-foreground">
          You can resend the verification email in <span className="font-medium">{cooldown}</span> second{cooldown !== 1 ? 's' : ''}
        </div>
      ) : (
        <div className="text-center text-xs sm:text-sm text-muted-foreground flex flex-row justify-center items-center gap-1">
          Didn&apos;t receive the email?{' '}
          <div 
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleResend(); } }}
            aria-label="Resend verification email"
            onClick={handleResend} 
            className="rounded-sm text-accent underline underline-offset-2 outline-none cursor-pointer focus-visible:ring-3 focus-visible:ring-accent/20 focus-visible:border focus-visible:border-accent/40"
          >
            Resend
          </div>
        </div>
      )}
    </div>
  );
}