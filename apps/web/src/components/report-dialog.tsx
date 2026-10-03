"use client";

import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_EVENT_TYPES,
  REPORT_EVENT_TYPE_LABELS,
} from "@defensownik/shared/config/reports";
import { reportFormSchema } from "@defensownik/shared/schemas/report";
import type { ReportFormValues } from "@defensownik/shared/schemas/report";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crosshair, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useMap } from "@/hooks/use-map";
import { useTRPC } from "@/lib/trpc";

const LocationPicker = dynamic(
  () => import("@/components/location-picker").then((m) => m.LocationPicker),
  { ssr: false },
);

const FORM_ID = "report-form";

const DEFAULT_VALUES: ReportFormValues = {
  reportEventType: "drone",
  description: "",
  lat: Number.NaN,
  lng: Number.NaN,
};

interface ReportDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function ReportDialog({ open, onOpenChange }: ReportDialogProps) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const createReport = useMutation(trpc.reports.create.mutationOptions());
  const { locateUser, isLocating } = useMap();
  const [pickerOpen, setPickerOpen] = useState(false);
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { isSubmitting } = form.formState;
  const lng = useWatch({ control: form.control, name: "lng" });

  const onSubmit = (values: ReportFormValues) => {
    onOpenChange(false);
    setPickerOpen(false);
    form.reset(DEFAULT_VALUES);
    toast.promise(
      createReport
        .mutateAsync(values)
        .then(() =>
          queryClient.invalidateQueries(
            trpc.layers.get.queryFilter({ layer: "reports" }),
          ),
        ),
      {
        loading: "Zapisywanie zgłoszenia...",
        success: "Zgłoszenie zapisane.",
        error: "Błąd podczas zapisywania zgłoszenia.",
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj zgłoszenie</DialogTitle>
            <DialogDescription>
              Zgłoś drona, przerwę w dostawie prądu lub inne zdarzenie w Twojej
              okolicy. Zgłoszenia są anonimowe i widoczne na mapie. W nagłych
              wypadkach dzwoń pod 112.
            </DialogDescription>
          </DialogHeader>

          <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="reportEventType"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="report-event-type">
                      Rodzaj wydarzenia
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="report-event-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="item-aligned">
                        {REPORT_EVENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {REPORT_EVENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="report-description">Opis</FieldLabel>
                    <InputGroup>
                      <InputGroupTextarea
                        {...field}
                        id="report-description"
                        rows={6}
                        className="min-h-24 resize-none"
                        placeholder="Krótki opis tego co zobaczyłeś"
                        aria-invalid={fieldState.invalid}
                      />
                      <InputGroupAddon align="block-end">
                        <InputGroupText className="tabular-nums">
                          {field.value.length}/{REPORT_DESCRIPTION_MAX_LENGTH}{" "}
                          znaków
                        </InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="lat"
                control={form.control}
                render={({ field, fieldState }) => {
                  const hasLocation =
                    Number.isFinite(field.value) && Number.isFinite(lng);
                  const setLocation = (location: {
                    lat: number;
                    lng: number;
                  }) => {
                    form.setValue("lat", location.lat, {
                      shouldValidate: true,
                    });
                    form.setValue("lng", location.lng, {
                      shouldValidate: true,
                    });
                  };
                  return (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Lokalizacja</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isLocating}
                          onClick={async () => {
                            const location = await locateUser();
                            if (location === null) {
                              toast.error("Nie udało się pobrać lokalizacji");
                            } else {
                              setLocation(location);
                            }
                          }}
                        >
                          {isLocating ? <Spinner /> : <Crosshair />}
                          Moja lokalizacja
                        </Button>
                        <Button
                          type="button"
                          variant={pickerOpen ? "secondary" : "outline"}
                          onClick={() => setPickerOpen((open) => !open)}
                        >
                          <MapPin />
                          Wybierz na mapie
                        </Button>
                      </div>
                      {pickerOpen ? (
                        <div className="h-64 overflow-hidden rounded-lg border">
                          <LocationPicker
                            value={
                              hasLocation ? { lat: field.value, lng } : null
                            }
                            onChange={setLocation}
                          />
                        </div>
                      ) : null}
                      {hasLocation ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {field.value.toFixed(6)}, {lng.toFixed(6)}
                        </p>
                      ) : null}
                      <FieldError
                        errors={[fieldState.error, form.formState.errors.lng]}
                      />
                    </Field>
                  );
                }}
              />
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
