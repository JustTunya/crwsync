"use client";

import Image from "next/image";
import countries from "world-countries";
import { useState, useActionState } from "react";
import { SignupState, SignupPayload, Country } from "@crwsync/types";
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar04Icon } from "@hugeicons/core-free-icons";
import { useAvailability } from "@/hooks/use.availability";
import { signup } from "@/services/auth.service";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

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
      phone: `${dial}${phone}`,
      username: username,
      firstname: firstname,
      lastname: lastname,
      birthdate: birthdate ? birthdate.toISOString().split("T")[0] : "",
      password: password
    };
    dispFormAction(payload);
  };

  const countrylist: Country[] = countries.map((country) => ({
    name: country.name.common,
    iso3166: {
      alpha2: country.cca2,
      alpha3: country.cca3,
      numeric: country.ccn3,
    },
    dial_code: country.idd.root + (country.idd.suffixes[0] || ""),
    flag: `/flags/${country.ccn3}.svg`,
  }));

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [dial, setDial] = useState("US");
  const [phone, setPhone] = useState("");
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState<Date | undefined>(undefined);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [confpassword, setConfirmPassword] = useState("");
  const [showConfPass, setShowConfPass] = useState(false);

  const checkEmail = useAvailability("email", email);
  const checkUsername = useAvailability("username", username);

  const onSelectCountry = (value: string) => {
    setDial(value);
    console.log("Selected country:", value);
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white/40 backdrop-blur-md border border-white/50 shadow-xl/5 rounded-2xl">
    <form action={formAction} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          validation={checkEmail}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!checkEmail && (
          <Label className="text-red-500">Email is already taken</Label>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          value={username}
          validation={checkUsername}
          onChange={(e) => setUsername(e.target.value)}
        />
        {!checkUsername && (
          <Label className="text-red-500">Username is already taken</Label>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="phone">Phone Number</Label>

        <div className="flex flex-row items-center space-x-2">
          <Select value={dial} onValueChange={onSelectCountry}>
            <SelectTrigger>
              <SelectValue>
                {(() => {
                  const selection = countrylist.find((c) => c.iso3166.alpha2 === dial);
                  if (!selection) return <span>Select Country</span>;
                  return (
                    <>
                      <div className="w-6 h-4 relative">
                        <Image
                          src={selection.flag}
                          alt={selection.iso3166.alpha2}
                          fill
                          className="object-cover rounded-[3px] shadow-xs"
                          onError={(e) => {
                            // Fallback to a placeholder if the flag image fails to load
                            e.currentTarget.src = "/flags/placeholder.svg";
                          }}
                        />
                        <div className="absolute inset-0 rounded-[3px] shadow-[inset_0_4px_4px_-2px_rgba(255,255,255,0.5),inset_0_-1px_3px_-1px_rgba(0,0,0,0.4)]" />
                      </div>
                      <p className="text-sm font-medium">{selection.dial_code}</p>
                    </>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countrylist.filter((c) => c.dial_code).sort((a, b) => a.iso3166.alpha2.localeCompare(b.iso3166.alpha2)).map((c) => (
                <SelectItem key={c.iso3166.alpha2} value={c.iso3166.alpha2}>
                  <div className="w-6 h-4 relative">
                    <Image 
                      src={c.flag} 
                      alt={c.iso3166.alpha2} 
                      fill 
                      className="object-cover rounded-[4px] shadow-md"
                      onError={(e) => {
                        // Fallback to a placeholder if the flag image fails to load
                        e.currentTarget.src = "/flags/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 rounded-[4px] shadow-[inset_0_4px_4px_-2px_rgba(255,255,255,0.5),inset_0_-1px_3px_-1px_rgba(0,0,0,0.4)]" />
                  </div>
                  <p className="text-sm font-medium">{c.iso3166.alpha2}</p>
                  <p className="text-xs text-blue-800 bg-blue-800/10 px-1 pb-0.5 pt-0 rounded-sm">{c.dial_code}</p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        {true && (
          <Label className="text-red-500">Please provide a valid phone number</Label>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-row space-x-3">
          <div className="space-y-3">
            <Label htmlFor="firstname">First Name</Label>
            <Input
              id="firstname"
              type="text"
              value={firstname}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="lastname">Last Name</Label>
            <Input
              id="lastname"
              type="text"
              value={lastname}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        {true && (
          <Label className="text-red-500">Please provide a valid first and last name</Label>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="birthdate">Birthdate</Label>
        <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
          <PopoverTrigger asChild className="bg-white/60 backdrop-blur-md border border-white/50 shadow-lg/5 font-normal">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setOpenCalendar(!openCalendar)}
            >
              {birthdate ? birthdate.toISOString().split("T")[0] : "Select Birthdate"}
              <HugeiconsIcon icon={Calendar04Icon} size={18} strokeWidth={1} className="ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={birthdate}
              captionLayout="dropdown"
              onSelect={(date) => {
                if (date) {
                  setBirthdate(date);
                  setOpenCalendar(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        {true && (
          <Label className="text-red-500">Please provide a valid birthdate</Label>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          visible={showPass}
          setVisible={() => setShowPass(!showPass)}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="confpassword">Confirm Password</Label>
        <Input
          id="confpassword"
          type="password"
          value={confpassword}
          visible={showConfPass}
          setVisible={() => setShowConfPass(!showConfPass)}
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