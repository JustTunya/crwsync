"use client";

import { useState, useActionState } from "react";
import { SignupState, SignupPayload } from "@crwsync/types";
import { signup } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initState: SignupState = {
  success: false,
  errors: {},
  message: "",
};

export function SignupForm() {
  const [state, dispFormAction, pending] = useActionState(signup, initState);
  
  const formAction = () => {
    const payload: SignupPayload = {
      email: email,
      phone: phone,
      username: username,
      firstname: firstname,
      lastname: lastname,
      birthdate: birthdate,
      password: password
    };
    console.log("Form submitted:", payload);
    dispFormAction(payload);
  };

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword] = useState("");
  const [confpassword, setConfirmPassword] = useState("");

  const [emailCheck, setEmailCheck] = useState<"checking" | "available" | "taken" | null>(null);
  const [phoneCheck, setPhoneCheck] = useState<"checking" | "available" | "taken" | null>(null);
  const [usernameCheck, setUsernameCheck] = useState<"checking" | "available" | "taken" | null>(null);

  const handleEmailCheck = async (email: string) => {
    return; // TODO: Implement email availability check
  };

  const handlePhoneCheck = async (phone: string) => {
    return; // TODO: Implement phone availability check
  };

  const handleUsernameCheck = async (username: string) => {
    return; // TODO: Implement username availability check
  };

  return (
    <div>
      <form action={formAction} className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleEmailCheck(email)}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => handlePhoneCheck(phone)}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => handleUsernameCheck(username)}
          />
        </div>

        <div className="flex flex-row space-x-4">
          <div className="space-y-4">
            <Label htmlFor="firstname">First Name</Label>
            <Input
              id="firstname"
              type="text"
              value={firstname}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="lastname">Last Name</Label>
            <Input
              id="lastname"
              type="text"
              value={lastname}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label htmlFor="birthdate">Birthdate</Label>
          <Input
            id="birthdate"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="confpassword">Confirm Password</Label>
          <Input
            id="confpassword"
            type="password"
            value={confpassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </div>
  );
}