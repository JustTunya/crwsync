"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useActionState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { SignupState, SignupPayload } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { signup } from "@/services/auth.service";
import { cn, variants } from "@/lib/utils";
import { Header } from "./ui/header";

const SignupStep1 = dynamic(() => import("@/components/signup-step1"), { ssr: false });
const SignupStep2 = dynamic(() => import("@/components/signup-step2"), { ssr: false });
const SignupStep3 = dynamic(() => import("@/components/signup-step3"), { ssr: false });

const initState: SignupState = {
  success: false,
  errors: {},
  message: "",
};

export function SignupForm() {
  const steps = 3;
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
    }
    dispatch(payload);
  }

  useEffect(() => {
    if (state.success && state.userId) {
      setUserId(state.userId);
      setStep(3);
    }
  }, [state]);

  return (
    <GlassBox>
      <Header title="Create Your Account" description="Please fill in the details below to create your account." />

      <form action={handleSubmit} className="w-full flex flex-col items-center">
          <div className="w-2/3 sm:w-1/2 flex justify-between items-center gap-1 sm:gap-2 mb-8 sm:mb-12">
            {Array.from({ length: steps }, (_, i) => (
              <div key={i} className={cn(
                "relative flex items-center",
                (i + 1 < steps) && "w-full"
              )}>
                <div key={i} className="flex items-center justify-center bg-primary text-primary-foreground text-xs sm:text-sm size-5 sm:size-6 rounded-full">
                  {(step === i + 1) ? (
                    <>
                      <div className="size-2 sm:size-3 rounded-full bg-primary-foreground shadow-[0_0_4px_2px_rgba(255,255,255,0.2)]" />
                      <div className={cn("absolute inline-0 opacity-50 size-2 sm:size-3 rounded-full bg-primary-foreground shadow-[0_0_4px_2px_rgba(255,255,255,0.2)] animate-ping")}/>
                    </>
                  ) : (i + 1 < step) ? (
                    <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-4 sm:size-5 text-primary-foreground" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>

                {(i + 1 < steps) && (<div className="bg-primary h-[0.15rem] sm:h-[0.2rem] w-[calc(100%-2rem)] ml-2 rounded-full" />)}
              </div>
            ))}
          </div>

        <AnimatePresence mode="wait">
          {(step === 1) && (
            <motion.div 
              key="step1"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full space-y-6"
            >
              <SignupStep1
                form={form}
                updateForm={updateForm}
                onNext={() => setStep(2)}
                pending={pending}
              />
            </motion.div>
          )}

          {(step === 2) && (
            <motion.div 
              key="step2"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full space-y-6"
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

          {(step === 3) && (
            <motion.div 
              key="step3"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full space-y-6"
            >
              <SignupStep3 email={form.email} userId={userId!} />
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      { step < 3 && (
        <div className="mt-6">
          <p className="w-full text-center text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50 focus-visible:outline-none">
              Sign In
            </Link>
          </p>
        </div>
      )}
    </GlassBox>
  );
}