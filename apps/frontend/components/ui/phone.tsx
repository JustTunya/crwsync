"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import countries from "world-countries";
import { getExampleNumber, CountryCode } from "libphonenumber-js";
import examplesMobile from "libphonenumber-js/examples.mobile.json";
import { Country } from "@crwsync/types";
import { isPhoneNumberValid } from "@/lib/validations"
import { useValidator } from "@/hooks/use.validator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Input } from "./input";

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

export function PhoneInput({
  phone,
  setPhone,
  dial,
  setDial,
}: {
  phone: string;
  setPhone: (value: string) => void;
  dial: string;
  setDial: (value: string) => void;
  examplesMobile?: boolean;
}) {
  const [phonePlaceholder, setPhonePlaceholder] = useState("");

  useEffect(() => {
  const num = getExampleNumber(dial as CountryCode, examplesMobile);
  setPhonePlaceholder(num ? num.nationalNumber : "");
}, [dial]);

  return (
    <div className="flex flex-row items-center space-x-2">
      <Select value={dial} onValueChange={setDial}>
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
              <p className="text-xs text-accent bg-accent/20 px-1 pb-0.5 pt-0 rounded-sm">{c.dial_code}</p>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id="phone"
        type="tel"
        value={phone}
        placeholder={phonePlaceholder}
        onChange={(e) => setPhone(e.target.value)}
      />
    </div>
  );
}