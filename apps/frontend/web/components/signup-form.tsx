"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useActionState, useEffect } from "react";
import { SignupState, SignupPayload } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { signup } from "@/services/auth.service";
import { cn, variants } from "@/lib/utils";
import { Lead } from "./ui/lead";

const SignupStep1 = dynamic(() => import("@/components/signup-step1"), { ssr: false });
const SignupStep2 = dynamic(() => import("@/components/signup-step2"), { ssr: false });
const SignupStep3 = dynamic(() => import("@/components/signup-step3"), { ssr: false });

const initState: SignupState = {
  success: false,
  errors: {},
  message: "",
};

const STEP_LABELS = ["Account", "Details", "Verify"];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="w-2/3 sm:w-1/2 flex items-center gap-1.5 mx-auto mb-6 sm:mb-8" aria-label={`Step ${step} of ${STEP_LABELS.length}: ${STEP_LABELS[step - 1]}`}>
      {STEP_LABELS.map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i + 1 <= step ? "bg-primary" : "bg-foreground/10"
          )}
        />
      ))}
    </div>
  );
}

export function SignupForm() {
  const [step, setStep] = useState(1);
  const [state, dispatch, pending] = useActionState(signup, initState);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confpassword: "",
    firstname: "",
    lastname: "",
    birthyear: "",
    birthmonth: "",
    birthday: ""
  });

  const updateForm = useCallback((field: keyof typeof form, value: string | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = () => {
    const payload: SignupPayload = {
      email: form.email,
      username: form.username,
      password: form.password,
      firstname: form.firstname,
      lastname: form.lastname,
      birthdate: `${form.birthyear}-${form.birthmonth}-${form.birthday}`,
    };
    dispatch(payload);
  };

  useEffect(() => {
    if (state.success && state.userId) {
      setTimeout(() => {
        setUserId(state.userId);
        setStep(3);
      }, 0);
    }
  }, [state]);

  return (
    <GlassBox>
      <Lead title="Create Your Account" description="Please fill in the details below to create your account." />

      <form action={handleSubmit} className="w-full flex flex-col items-center">
        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full space-y-5"
            >
              <SignupStep1
                form={form}
                updateForm={updateForm}
                onNext={() => setStep(2)}
                pending={pending}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full space-y-5"
            >
              <SignupStep2
                form={form}
                updateForm={updateForm}
                onBack={() => setStep(1)}
                onSubmit={() => setStep(3)}
                pending={pending}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full space-y-5"
            >
              <SignupStep3 email={form.email} userId={userId!} />
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {step < 3 && (
        <div className="mt-5">
          <p className="w-full text-center text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-primary underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              Sign In
            </Link>
          </p>
        </div>
      )}
    </GlassBox>
  );
}