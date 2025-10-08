import { useState, useMemo } from "react";
import { motion, AnimatePresence, cubicBezier } from "framer-motion";
import { isEmailValid, isPasswordStrong, isUsernameValid } from "@/lib/validations";
import { strengthToColor, strengthToCount } from "@/lib/utils";
import { useMatch } from "@/hooks/use-match";
import { useAvailability } from "@/hooks/use-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useValidator } from "@/hooks/use-validator";

interface SignupStep1Props {
  form: {
    email: string;
    username: string;
    password: string;
    confpassword: string;
  };
  updateForm: (field: keyof SignupStep1Props["form"], value: string) => void;
  onNext: () => void;
  pending: boolean;
}

export default function SignupStep1(props: SignupStep1Props) {
  const [showPass, setShowPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);

  const validEmail = useAvailability("email", props.form.email, isEmailValid);
  const validUsername = useAvailability("username", props.form.username, isUsernameValid);
  const validPassword = useValidator(props.form.password, isPasswordStrong);
  const matchingPasswords = useMatch(props.form.password, props.form.confpassword);

  const activeCount = strengthToCount(validPassword?.meta?.level);
  const barColor = strengthToColor(validPassword?.meta?.level);
  const hasPassword = props.form.password.length > 0;

  const validStep = useMemo(() => {
    return (
      validEmail?.available === true &&
      validUsername?.available === true &&
      validPassword?.value === true &&
      matchingPasswords === true
    );
  }, [validEmail, validUsername, validPassword, matchingPasswords]);

  return(
    <>
      <div className="space-y-4">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={props.form.email}
          placeholder="johndoe@example.com"
          validation={validEmail?.available}
          onChange={(e) => props.updateForm("email", e.target.value)}
          error={validEmail?.available === false}
          autoFocus
        />
        {(validEmail?.available === false && validEmail?.message) && (
          <Label error>{validEmail.message}</Label>
        )}
      </div>

      <div className="space-y-4">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          value={props.form.username}
          placeholder="johndoe"
          validation={validUsername?.available}
          onChange={(e) => props.updateForm("username", e.target.value)}
          error={validUsername?.available === false}
        />
        {(validUsername?.available === false && validUsername?.message) && (
          <Label error>{validUsername.message}</Label>
        )}
      </div>

      <div className="space-y-4">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={props.form.password}
          visible={showPass}
          setVisible={() => setShowPass(!showPass)}
          onChange={(e) => props.updateForm("password", e.target.value)}
          error={matchingPasswords === false && validPassword?.value === true}
        />
      </div>

      <AnimatePresence initial={false}>
        {hasPassword && (
          <motion.div
            key="pw-indicator"
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: cubicBezier(0.22, 1, 0.36, 1) }}
            className="overflow-hidden"
            aria-live="polite"
          >
            <div className="flex flex-row items-center justify-between">
              <div className="w-[70%] flex flex-row gap-3">
                {[1, 2, 3].map((s) => {
                  const active = s <= activeCount;
                  return(
                    <motion.div
                      key={s}
                      className="h-2 w-full rounded-full"
                      initial={false}
                      animate={{
                        backgroundColor: active ? barColor : "var(--color-base-400)"
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    />
                  );
                })}
              </div>

              <div className="min-w-[9rem] text-right">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={validPassword?.meta?.level ?? "none"}
                    initial={{ y: 6, opacity: 0, filter: "blur(2px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -6, opacity: 0, filter: "blur(2px)" }}
                    transition={{ duration: 0.18 }}
                    style={{ color: barColor }}
                    className="text-xs font-medium inline-block"
                  >
                    {!validPassword?.meta?.level && "Enter a password"}
                    {validPassword?.meta?.level === "weak" && "Too weak"}
                    {validPassword?.meta?.level === "medium" && "Could be stronger"}
                    {validPassword?.meta?.level === "strong" && "Strong password"}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <Label htmlFor="confpassword">Confirm Password</Label>
        <Input
          id="confpassword"
          type="password"
          value={props.form.confpassword}
          visible={showConfPass}
          setVisible={() => setShowConfPass(!showConfPass)}
          onChange={(e) => props.updateForm("confpassword", e.target.value)}
          error={matchingPasswords === false && validPassword?.value === true}
        />
        {(matchingPasswords === false) && (
          <Label error>Passwords do not match</Label>
        )}
      </div>

      <Button
        type="button"
        onClick={props.onNext}
        disabled={props.pending || !validStep}
      >
        Continue
      </Button>
    </>
  );
}
