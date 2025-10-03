import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { UserGender, UserGenderValue } from "@crwsync/types";
import { isNameValid, isBirthdateValid } from "@/lib/validations";
import { useValidator } from "@/hooks/use-validator";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignupStep2Props {
  form: {
    firstname: string;
    lastname: string;
    gender: UserGenderValue | undefined;
    birthyear: string;
    birthmonth: string;
    birthday: string;
  };
  updateForm: (field: keyof SignupStep2Props["form"], value: string | UserGenderValue | undefined) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
}

export default function SignupStep2(props: SignupStep2Props) {
  const validFirstName = useValidator(props.form.firstname, isNameValid);
  const validLastName = useValidator(props.form.lastname, isNameValid);

  const validGender = useMemo(() => {
    return props.form.gender !== undefined && Object.values(UserGender).some(g => g.value === props.form.gender);
  }, [props.form.gender]);
  const validBirthdate = useMemo(() => {
    if (!props.form.birthyear || !props.form.birthmonth || !props.form.birthday) return undefined;
    return isBirthdateValid(`${props.form.birthyear}-${props.form.birthmonth}-${props.form.birthday}`);
  }, [props.form.birthyear, props.form.birthmonth, props.form.birthday]);

  const validForm = useMemo(() => {
    return (
      validFirstName &&
      validLastName &&
      validGender &&
      validBirthdate
    );
  }, [validFirstName, validLastName, validGender, validBirthdate]);

  const daysInMonth = useMemo(() => {
    const month = parseInt(props.form.birthmonth, 10);
    const year = parseInt(props.form.birthyear, 10);

    if (!month || !year) return 31;

    return new Date(year, month, 0).getDate();
  }, [props.form.birthmonth, props.form.birthyear]);

  useEffect(() => {
    if (!props.form.birthday) return;
    const day = parseInt(props.form.birthday, 10);
    if (day > daysInMonth) {
      props.updateForm("birthday", daysInMonth.toString().padStart(2, '0'));
    }
  }, [props.form.birthday, daysInMonth]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-row justify-between gap-4">
          <div className="w-full space-y-4">
            <Label htmlFor="firstname">First Name</Label>
            <Input
              id="firstname"
              type="text"
              placeholder="John"
              value={props.form.firstname}
              onChange={(e) => props.updateForm("firstname", e.target.value)}
              className={(validFirstName?.value === false) ? "border-error" : ""}
              autoFocus
            />
          </div>

          <div className="w-full space-y-4">
            <Label htmlFor="lastname">Last Name</Label>
            <Input
              id="lastname"
              type="text"
              placeholder="Doe"
              value={props.form.lastname}
              onChange={(e) => props.updateForm("lastname", e.target.value)}
              className={(validLastName?.value === false) ? "border-error" : ""}
            />
          </div>
        </div>
        {(validFirstName?.value === false) && (
          <Label error>This first name is invalid</Label>
        )}
        {(validLastName?.value === false) && (
          <Label error>This last name is invalid</Label>
        )}
      </div>
    
      <div className="space-y-4">
        <Label htmlFor="lastname">Gender</Label>
        <Select value={props.form.gender} onValueChange={(value) => props.updateForm("gender", value)}>
          <SelectTrigger size="full">
            <SelectValue placeholder="Gender">
              { Object.values(UserGender).find(g => g.value === props.form.gender)?.label || "Select" }
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
          <Select value={props.form.birthyear} onValueChange={(value) => props.updateForm("birthyear", value)}>
            <SelectTrigger size="full">
              <SelectValue placeholder="Year">
                {props.form.birthyear}
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

          <Select value={props.form.birthmonth} onValueChange={(value) => props.updateForm("birthmonth", value)}>
            <SelectTrigger  size="full">
              <SelectValue placeholder="Month">
                {props.form.birthmonth}
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

          <Select value={props.form.birthday} onValueChange={(value) => props.updateForm("birthday", value)}>
            <SelectTrigger size="full">
              <SelectValue placeholder="Day">
                {props.form.birthday}
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
          onClick={props.onBack}
          disabled={props.pending}
          className="w-[calc(25%-0.5rem)]"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
          Back
        </Button>

        <Button
          type="submit"
          onClick={props.onSubmit}
          disabled={props.pending || !validForm}
          className="w-[calc(75%-0.5rem)]"
        >
          {props.pending ? "Creating account..." : "Create Account"}
        </Button>
      </div>
    </>
  );
}