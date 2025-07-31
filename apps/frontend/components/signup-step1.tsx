import { useState, useMemo, useCallback } from "react";
import { isEmailValid, isUsernameValid } from "@/lib/validations";
import { useMatch } from "@/hooks/use-match";
import { useAvailability } from "@/hooks/use-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confpassword, setConfirmPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);

  const validEmail = useAvailability("email", email, isEmailValid);
  const validUsername = useAvailability("username", username, isUsernameValid);
  const validPassword = useMatch(password, confpassword);

  const validStep = useMemo(() => {
    return (
      validEmail?.available === true &&
      validUsername?.available === true &&
      validPassword === true
    );
  }, [validEmail, validUsername, validPassword]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    props.updateForm("email", e.target.value);
  }, [props]);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    props.updateForm("username", e.target.value);
  }, [props]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    props.updateForm("password", e.target.value);
  }, [props]);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    props.updateForm("confpassword", e.target.value);
  }, [props]);

  return(
    <>
      <div className="space-y-4">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          placeholder="johndoe@example.com"
          validation={validEmail?.available}
          onChange={handleEmailChange}
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
          value={username}
          placeholder="johndoe"
          validation={validUsername?.available}
          onChange={handleUsernameChange}
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
          value={password}
          visible={showPass}
          setVisible={() => setShowPass(!showPass)}
          onChange={handlePasswordChange}
          error={validPassword === false}
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
          onChange={handleConfirmPasswordChange}
          error={validPassword === false}
        />
        {(validPassword === false) && (
          <Label error>Passwords do not match or are too short</Label>
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
