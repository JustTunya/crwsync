import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon } from '@hugeicons/core-free-icons';
import { verifyEmail } from '@/services/auth.service';

interface SignupStep3Props {
  email: string;
}

export default function SignupStep3({ email }: SignupStep3Props) {
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
      <p className="text-sm text-center text-muted-foreground font-light">Please check your email '<span className="text-primary font-medium">{email}</span>' and click the link inside to verify your account.</p>
      <Button onClick={openMailbox} variant="outline" type="button" className="w-full">
        <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={2} />
        Open mailbox
      </Button>
      <div className="text-center text-xs sm:text-sm text-muted-foreground flex flex-row justify-center items-center gap-1">
        Didn&apos;t receive the email?{' '}
        <div onClick={() => {verifyEmail(email)}} className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none cursor-pointer">
          Resend
        </div>
      </div>
    </div>
  );
}