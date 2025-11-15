import { useState, useMemo } from "react";
import { isEmailValid, isPasswordStrong, isUsernameValid } from "@/lib/validations";
import { useMatch } from "@/hooks/use-match";
import { useAvailability } from "@/hooks/use-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useValidator } from "@/hooks/use-validator";
import { StrengthIndicator } from "./ui/strength_indicator";

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
      <div className="space-y-2 sm:space-y-3">
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
          <div className="w-full flex justify-center">
            <Label error>{validEmail.message}</Label>
          </div>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
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
          <div className="w-full flex justify-center">
            <Label error>{validUsername.message}</Label>
          </div>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
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
        <StrengthIndicator visible={hasPassword} level={validPassword?.meta?.level} />
      </div>

      <div className="space-y-2 sm:space-y-3">
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
          <div className="w-full flex justify-center">
            <Label error>Passwords do not match</Label>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={props.onNext}
        // disabled={props.pending || !validStep}
      >
        Continue
      </Button>
    </>
  );
}
