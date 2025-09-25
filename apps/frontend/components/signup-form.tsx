"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useActionState } from "react";
import { SignupState, SignupPayload, UserGenderValue } from "@crwsync/types";
import { GlassBox } from "@/components/ui/glassbox";
import { signup } from "@/services/auth.service";
import { cn, variants } from "@/lib/utils";

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
  const [, dispatch, pending] = useActionState(signup, initState);

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confpassword: "",
    firstname: "",
    lastname: "",
    gender: undefined as UserGenderValue | undefined,
    birthyear: "",
    birthmonth: "",
    birthday: ""
  });

  const updateForm = useCallback((field: keyof typeof form, value: string | UserGenderValue | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = () => {
    const payload: SignupPayload = {
      email: form.email,
      username: form.username,
      password: form.password,
      firstname: form.firstname,
      lastname: form.lastname,
      gender: form.gender || '',
      birthdate: `${form.birthyear}-${form.birthmonth}-${form.birthday}`,
    }
    dispatch(payload);
  }

  return (
    <GlassBox>
      <div className="text-center space-y-2 mb-8 sm:mb-12">
        <h1 className="text-xl sm:text-2xl font-medium">Create Your Account</h1>
        <p className="text-xs sm:text-sm text-balance text-muted-foreground font-light">
          Please fill in the details below to create your account.
        </p>
      </div>

      <form action={handleSubmit} className="sm:min-w-sm flex flex-col items-center space-y-8">
          <div className="w-1/2 flex justify-between items-center gap-2 mb-12 sm:mb-16">
            {Array.from({ length: steps }, (_, i) => (
              <div key={i} className={cn(
                "relative flex items-center",
                (i + 1 < steps) && "w-full"
              )}>
                <div key={i} className={cn(
                  "size-6 rounded-full bg-accent flex items-center justify-center text-sm sm:text-base text-primary-content",
                  (step > i) ? "bg-accent/60" : "bg-muted-foreground/50"
                )}>
                  {(step > i) ? (
                    <>
                      <div className="size-3 rounded-full bg-base-200 shadow-[0_0_4px_2px_rgba(255,255,255,0.2)]" />
                      {(step === i+1) && <div className={cn("absolute inline-0 opacity-50 size-3 rounded-full bg-base-200 shadow-[0_0_4px_2px_rgba(255,255,255,0.2)]", (step === i+1) && "animate-ping")}/>}
                    </>
                  ) : (i+1)}
                </div>

                {(i + 1 < steps) && (
                  <div className={cn(
                    "h-0.5 w-[calc(100%-2rem)] ml-2",
                    (i + 1 < step) ? "bg-accent/60" : "bg-muted-foreground/50"
                  )} />
                )}
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
              <SignupStep3 email={form.email} />
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      { step < 3 && (
        <div className="mt-8">
          <p className="w-full text-center text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
              Sign In
            </Link>
          </p>
        </div>
      )}
    </GlassBox>
  );
}