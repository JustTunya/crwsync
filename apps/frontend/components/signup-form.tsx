"use client";

import { useState, useMemo, useEffect, useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { 
  UserGender, 
  UserGenderType, 
  SignupState, 
  SignupPayload 
} from "@crwsync/types";
import { useAvailability } from "@/hooks/use.availability";
import { useValidator } from "@/hooks/use.validator";
import { signup } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  isEmailValid,
  isUsernameValid,
  isNameValid,
  isBirthdateValid,
} from "@/lib/validations"
import { useMatch } from "@/hooks/use.match";
import Link from "next/link";
import { cn, variants } from "@/lib/utils";
import { GlassBox } from "@/components/ui/glassbox";


const initState: SignupState = {
  success: false,
  errors: {},
  message: "",
};

export function SignupForm() {
  const steps = 3;

  const [state, dispFormAction, pending] = useActionState(signup, initState);
  
  const formAction = () => {
    const payload: SignupPayload = {
      email: email,
      username: username,
      firstname: firstname,
      lastname: lastname,
      birthdate: `${birthyear}-${birthmonth}-${birthday}`,
      gender: gender?.value || '',
      password: password
    };
    dispFormAction(payload);
  };

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [gender, setGender] = useState<UserGenderType | undefined>(undefined);
  const [birthyear, setBirthyear] = useState("");
  const [birthmonth, setBirthmonth] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [confpassword, setConfirmPassword] = useState("");
  const [showConfPass, setShowConfPass] = useState(false);

  const [step, setStep] = useState(1);

  const checkEmail = useAvailability("email", email);
  const checkUsername = useAvailability("username", username);

  const validEmail = useValidator(email, isEmailValid);
  const validUsername = useValidator(username, isUsernameValid);
  const validFirstName = useValidator(firstname, isNameValid);
  const validLastName = useValidator(lastname, isNameValid);
  const validGender = useMemo(() => {
    return gender?.value !== undefined;
  }, [gender]);
  const validPassword = useMatch(password, confpassword);
  const validBirthdate = useMemo(() => {
    if (!birthyear || !birthmonth || !birthday) return undefined;
    return isBirthdateValid(`${birthyear}-${birthmonth}-${birthday}`);
  }, [birthyear, birthmonth, birthday]);

  const daysInMonth = useMemo(() => {
    const month = parseInt(birthmonth, 10);
    const year = parseInt(birthyear, 10);

    if (!month || !year) return 31;

    return new Date(year, month, 0).getDate();
  }, [birthmonth, birthyear]);

  useEffect(() => {
    if (!birthday) return;
    const day = parseInt(birthday, 10);
    if (day > daysInMonth) {
      setBirthday(daysInMonth.toString().padStart(2, '0'));
    }
  }, [birthday, daysInMonth]);

  return (
    <GlassBox>
      <div className="text-center space-y-2 mb-8 sm:mb-12">
        <h1 className="text-xl sm:text-2xl font-medium">Create Your Account</h1>
        <p className="text-xs sm:text-sm text-balance text-muted-foreground/75 font-light">
          Please fill in the details below to create your account.
        </p>
      </div>

      <form action={formAction} className="sm:min-w-sm flex flex-col items-center space-y-8">
          <div className="w-1/2 flex justify-between items-center mb-12 sm:mb-16">
            {Array.from({ length: steps }, (_, i) => (
              <div key={i} className={cn(
                "size-6 rounded-full bg-accent flex items-center justify-center text-base text-primary-content",
                (step > i) ? "bg-accent/60" : "bg-muted-foreground/50"
              )}>
                {(step > i) ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-base-200 shadow-[0_0_4px_2px_rgba(255,255,255,0.2)]" />
                    {(step === i+1) && <div className={cn("absolute inline-0 opacity-50 w-3 h-3 rounded-full bg-base-200 shadow-[0_0_4px_2px_rgba(255,255,255,0.2)]", (step === i+1) && "animate-ping")}/>}
                  </>
                ) : (i+1)}
              </div>
            ))}
          </div>

        <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full space-y-6"
          >
          <div className="space-y-4">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              placeholder="johndoe@example.com"
              validation={checkEmail && validEmail}
              onChange={(e) => setEmail(e.target.value)}
              className={(checkEmail === false || validEmail === false) ? "border-error" : ""}
            />
            {(checkEmail === false) && (
              <Label error>This email address is already taken</Label>
            )}
            {(validEmail === false) && (
              <Label error>This email address is invalid</Label>
            )}
          </div>

          <div className="space-y-4">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              placeholder="johndoe"
              validation={checkUsername && validUsername}
              onChange={(e) => setUsername(e.target.value)}
              className={(checkUsername === false || validUsername === false) ? "border-error" : ""}
            />
            {(checkUsername === false) && (
              <Label error>This username is already taken</Label>
            )}
            {(validUsername === false) && (
              <Label error>This username is invalid</Label>
            )}
          </div>

          <div className="space-y-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              visible={showPass}
              setVisible={() => setShowPass(!showPass)}
              onChange={(e) => setPassword(e.target.value)}
              className={(validPassword === false) ? "border-error" : ""}
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="confpassword">Confirm Password</Label>
            <Input
              id="confpassword"
              type="password"
              value={confpassword}
              visible={showConfPass}
              setVisible={() => setShowConfPass(!showConfPass)}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={(validPassword === false) ? "border-error" : ""}
            />
            {(validPassword === false) && (
              <Label error>Passwords do not match or are too short</Label>
            )}
          </div>

          <Button
            type="button"
            onClick={() => setStep(2)}
            disabled={pending || !(
              validEmail && 
              validUsername && 
              validPassword &&
              checkEmail &&
              checkUsername
            )}
          >
            Continue
          </Button>
        </motion.div>
        )}

        {step === 2 && (
        <motion.div 
          key="step1"
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="w-full space-y-6"
        >
          <div className="space-y-4">
            <div className="flex flex-row justify-between gap-4">
              <div className="w-full space-y-4">
                <Label htmlFor="firstname">First Name</Label>
                <Input
                  id="firstname"
                  type="text"
                  placeholder="John"
                  value={firstname}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={(validFirstName === false) ? "border-error" : ""}
                />
              </div>

              <div className="w-full space-y-4">
                <Label htmlFor="lastname">Last Name</Label>
                <Input
                  id="lastname"
                  type="text"
                  placeholder="Doe"
                  value={lastname}
                  onChange={(e) => setLastName(e.target.value)}
                  className={(validLastName === false) ? "border-error" : ""}
                />
              </div>
            </div>
            {(validFirstName === false) && (
              <Label error>This first name is invalid</Label>
            )}
            {(validLastName === false) && (
              <Label error>This last name is invalid</Label>
            )}
          </div>
        
          <div className="space-y-4">
            <Label htmlFor="lastname">Gender</Label>
            <Select value={gender?.value} onValueChange={(value) => {
              const selectedGender = Object.values(UserGender).find(g => g.value === value);
              setGender(selectedGender);
            }}>
              <SelectTrigger size="full">
                <SelectValue placeholder="Gender">
                  {gender?.label || "Select"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(UserGender).map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label htmlFor="birthdate">Birthdate</Label>
            <div className="flex flex-row justify-center items-center gap-4">
              <Select value={birthyear} onValueChange={setBirthyear}>
                <SelectTrigger size="full">
                  <SelectValue placeholder="Year">
                    {birthyear}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).reverse().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={birthmonth} onValueChange={setBirthmonth}>
                <SelectTrigger  size="full">
                  <SelectValue placeholder="Month">
                    {birthmonth}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={birthday} onValueChange={setBirthday}>
                <SelectTrigger size="full">
                  <SelectValue placeholder="Day">
                    {birthday}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0')).map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(validBirthdate === false) && (
              <Label error>You must be at least 13 years old to register</Label>
            )}
          </div>

          <div className="mx-auto max-w-xs text-xs text-center text-muted-foreground text-pretty">
            By creating an account, you agree to our{" "}
            <Link href="/legal/terms" className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
              Privacy Policy
            </Link>.
          </div>

          <div className="flex justify-center items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={pending}
              className="w-[calc(25%-0.5rem)]"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
              Back
            </Button>

            <Button
              type="submit"
              onClick={() => setStep(3)}
              disabled={pending || !(
                validEmail && 
                validUsername && 
                validFirstName && 
                validLastName && 
                validGender &&
                validBirthdate && 
                validPassword &&
                checkEmail &&
                checkUsername
              )}
              className="w-[calc(75%-0.5rem)]"
            >
              {pending ? "Creating account..." : "Create Account"}
            </Button>
          </div>
        </motion.div>
        )}
        </AnimatePresence>
      </form>

      {step === 3 && (
        <motion.div
          key="step3"
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="text-center space-y-4"
        >
          <h2 className="text-lg font-semibold">Congratulations!</h2>
          <p className="text-sm text-muted-foreground">
            Your account has been successfully created. You can now sign in.
          </p>
        </motion.div>
      )}

      {state.message && (
        <Label error className="mt-4 text-center">
          {state.message}
        </Label>
      )}

      <div className="mt-8">
        <p className="w-full text-center text-xs sm:text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-accent underline underline-offset-2 rounded-sm focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none">
            Sign In
          </Link>
        </p>
      </div>
    </GlassBox>
  );
}