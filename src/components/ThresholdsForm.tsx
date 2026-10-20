"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { saveThresholds } from "@/lib/api";
import { thresholdsSchema, type Thresholds } from "@/lib/schema";

export const THRESHOLDS_KEY = ["thresholds"] as const;

const FIELDS: { name: keyof Thresholds; label: string }[] = [
  { name: "maxCoolantTempC", label: "Max coolant temp (°C)" },
  { name: "minFuelPct", label: "Min fuel (%)" },
  { name: "maxLoadPct", label: "Max load (%)" },
];

export function ThresholdsForm({ values }: { values: Thresholds }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Thresholds>({ resolver: zodResolver(thresholdsSchema), values });

  const mutation = useMutation({
    mutationFn: saveThresholds,
    onSuccess: (saved) => queryClient.setQueryData(THRESHOLDS_KEY, saved),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate aria-label="Alert thresholds" className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 font-semibold">Alert thresholds</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map(({ name, label }) => (
          <div key={name}>
            <label htmlFor={name} className="mb-1 block text-sm text-slate-300">{label}</label>
            <input id={name} type="number" step="any" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...register(name, { valueAsNumber: true })} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            {errors[name] && <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-red-300">{errors[name]?.message}</p>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
          {mutation.isPending ? "Saving…" : "Save thresholds"}
        </button>
        {mutation.isSuccess && <p role="status" className="text-sm text-emerald-300">Thresholds saved</p>}
        {mutation.isError && <p role="alert" className="text-sm text-red-300">Could not save thresholds. Try again.</p>}
      </div>
    </form>
  );
}
