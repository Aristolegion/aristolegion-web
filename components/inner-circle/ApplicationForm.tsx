"use client";

import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface FormState {
  name: string;
  email: string;
  role: string;
  whyJoin: string;
  capability: string;
  contribution: string;
}

const initialState: FormState = {
  name: "",
  email: "",
  role: "",
  whyJoin: "",
  capability: "",
  contribution: "",
};

const inputClasses =
  "w-full border border-charcoal/20 bg-ivory px-4 py-3 font-body text-sm text-charcoal placeholder:text-charcoal/40 transition-colors duration-200 focus:border-gold focus:outline-none";

const labelClasses = "mb-2 block font-body text-sm font-medium text-charcoal";

export function ApplicationForm() {
  const [formData, setFormData] = useState<FormState>(initialState);
  const [submitted, setSubmitted] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const roleId = useId();
  const whyJoinId = useId();
  const capabilityId = useId();
  const contributionId = useId();

  function handleChange(
    field: keyof FormState
  ): (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void {
    return (event) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card tone="ivory" className="mx-auto max-w-xl p-8 text-center md:p-12">
        <p className="font-display text-2xl font-semibold text-charcoal">
          Application Received
        </p>
        <p className="mt-4 font-body text-base leading-relaxed text-charcoal/70">
          Thank you{formData.name ? `, ${formData.name}` : ""} — your
          application has been received. Aristolegion reviews every
          application carefully; you will hear from us directly once a
          decision has been made.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className={labelClasses}>
            Full Name
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange("name")}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor={emailId} className={labelClasses}>
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange("email")}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={roleId} className={labelClasses}>
            Current Role
          </label>
          <input
            id={roleId}
            name="role"
            type="text"
            required
            value={formData.role}
            onChange={handleChange("role")}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={whyJoinId} className={labelClasses}>
            Why do you want to join?
          </label>
          <textarea
            id={whyJoinId}
            name="whyJoin"
            required
            rows={4}
            value={formData.whyJoin}
            onChange={handleChange("whyJoin")}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={capabilityId} className={labelClasses}>
            What capability are you developing?
          </label>
          <textarea
            id={capabilityId}
            name="capability"
            required
            rows={4}
            value={formData.capability}
            onChange={handleChange("capability")}
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={contributionId} className={labelClasses}>
            What do you hope to contribute?
          </label>
          <textarea
            id={contributionId}
            name="contribution"
            required
            rows={4}
            value={formData.contribution}
            onChange={handleChange("contribution")}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="mt-10 text-center">
        <Button type="submit" variant="primary">
          Submit Application
        </Button>
      </div>
    </form>
  );
}
