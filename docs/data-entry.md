# Importing arrival records and service samples

The workbench supports arrival records and service samples through the editors below. The built-in example, development lab and all included fixtures are synthetic test material, not measured-event evidence.

## Use the workbench

In **Build → Event settings**, expand **Arrival data** for the group to replace. Choose a file or paste data, select its units, preview, and choose **Apply data**. This changes only the event dialog's draft; its final Apply commits the shared scenario for all listed plans. Canceling the dialog discards the import. A pending import must be applied or canceled before the outer dialog can save.

Select a service node and expand **Service samples** in the Inspector. **Apply data** commits one undoable change to that node. The separate source editor changes only source metadata. Invalid imports and canceled previews leave the project untouched. Applied changes use normal draft recovery, export/import and stale-result detection.

## Open the lab

From this checkout run `npm run dev -- --port 4186 --strictPort`, then open <http://127.0.0.1:4186/labs/data-sources.html>. Choose English/中文, the plan, arrival stream and service node. The lab uses the existing open-house project's actual schema objects and both plans' shared scenario.

Paste CSV or tab-separated spreadsheet cells, or choose a UTF-8 CSV/TSV file. Choose **seconds** or **minutes** explicitly, then Preview. Apply data changes only the displayed project draft. Apply project commits that draft. Discard draft restores the committed project and clears pending nested edits. Export project downloads the committed project; an uncommitted import is not exported. Nothing is saved to browser storage.

## Arrival template

Download the template inside the arrival editor to obtain columns and allowed example values for the current scenario. For the built-in example:

```csv
id,arrival_time,attr:ticket,attr:visit
guest-1,0,regular,full
guest-2,1.5,vip,quick
```

These rows are synthetic placeholders. Replace them with your data. `arrival_time` is elapsed time since the activity started, not a clock timestamp. 1.5 minutes becomes 90 seconds. `id` must start with a lowercase ASCII letter, followed by lowercase letters, digits, `_` or `-`, up to 64 characters. Duplicate IDs within the imported stream are errors. The selected stream's own ID/name remain unchanged, so entrance references remain valid. Create a new group with the existing group workflow when needed; this editor replaces an existing group's records.

Every scenario attribute needs an `attr:<ID>` column with an existing allowed value. For example, an attribute whose ID is `arrival_time` uses `attr:arrival_time`; it is distinct from the required time column. Do not put provenance fields into the data table. Headers may be reordered. CSV quoted fields support commas, escaped quotes and line breaks; spreadsheet tab-separated input uses the same validation path. Blank lines are ignored; populated invalid rows are not silently discarded.

Cutoff is the observation/statistics boundary. Horizon is the maximum run time. A record after either boundary is legal and stays in the imported data. The preview counts records at or before cutoff, after cutoff, and after horizon; the last two counts overlap. Records beyond a corresponding run boundary do not arrive within that run's scope. Zero is valid. Negative, non-finite and malformed times are rejected.

## Service template

```csv
duration
22
31
18
```

These are synthetic example values. Duration runs from service start to service end and excludes queueing. Choose seconds or minutes explicitly. Zero and duplicate observations are valid; duplicates preserve their empirical sampling weight. The existing model permits 1–10,000 samples. The model draws from the full empirical sample array; the preview's count/minimum/maximum/arithmetic mean describe the imported sample, not a simulation outcome.

## Errors, cancellation and sources

The preview lists total and valid data rows, one-based physical line and field-column errors, converted seconds and the target. Fix all errors before Apply data. Valid rows in an invalid file are only a diagnostic preview; no partial import is allowed. Changing text, successfully reading another file or changing units requires a new preview. Cancel import leaves the parent model unchanged.

While a file is being read, the current text, units, source metadata and preview stay visible, but Preview and Apply data are disabled. If reading fails, an alert appears and the existing draft remains available to edit or apply. Selecting the same file again retries it. A successful read replaces the text and requires a new preview. Editing the text, cancelling the import or selecting a newer file prevents an older read from overwriting the current draft.

New input defaults to **User estimate**, even when the existing values were labelled Measured or Historical. Uploading a file does not establish its origin. Source and Notes survive the replacement so you can review and correct the explanation. After a successful preview, explicitly choose the appropriate label:

| Kind | Meaning |
| --- | --- |
| Synthetic | Generated example or hypothetical input |
| User estimate | An estimate or input whose evidence has not been confirmed |
| Measured | Observations measured for the intended activity; explain how they were collected |
| Historical | Records from an earlier activity; explain which one and why it is applicable |

Source and Notes each allow up to 1,000 Unicode code points using the existing schema. Editing those descriptions alone does not change the source kind. Hand-editing arrival or service values preserves source/notes and sets User estimate. A confirmed measurement correction can explicitly reselect Measured. Name-only edits leave provenance alone.

To edit an existing source without importing values, expand **Source kind** in the workbench. Arrival source changes stay in the event dialog's draft; service source changes require **Apply source**. Cancel source edit restores the service metadata draft. The separate development lab uses **Edit existing service source (keep current samples)** and its outer **Apply project** step.

Shared arrival changes affect all plans referencing that scenario. Outer Apply uses the normal project update path, making old simulation results stale. Service changes affect the selected service node in its plan.

## Component contract

Import named components from `src/components/data-sources/ArrivalDataEditor.tsx`, `ServiceDataEditor.tsx` and `ProvenanceFields.tsx`. The editors accept the interfaces in [D's task](parallel-release/04-measured-inputs.md); the service editor also accepts optional `targetName` for a specific node label. Pass `lang: 'en' | 'zh'`. `onChange` supplies a schema-valid replacement stream/duration after explicit Apply data. Route arrival replacements to the outer scenario draft; the Inspector commits a service replacement as one node edit. Key service drafts by their target and current duration. `ProvenanceFields` is a controlled metadata field group and takes `value`, `lang`, `onChange`, with optional `kindDisabled` for draft gating.

Pure exports from `src/features/data-sources/index.ts`:

- `parseArrivalData(text, unit, attributes, observationCutoff, horizon)` and `parseServiceData(text, unit)` return frozen previews with errors and summaries. `unit` is `'seconds' | 'minutes'`.
- `buildArrivalStream(stream, preview, provenance)` and `buildServiceDuration(preview, provenance)` return fresh schema-validated objects, or `null` on errors. Pass the same preview displayed to the user.
- `createArrivalTemplate(attributes)` and `createServiceTemplate()` return CSV text.
- `updateProvenance(previous, { valueChanged?, source?, notes?, kind? })` returns a new provenance object. An explicitly supplied kind takes precedence over the default downgrade. The caller must only supply a measured/historical kind following an explicit user selection for the current values.

The separate lab remains a Vite development entry; production users open these editors in the workbench. See the [module review report](reviews/measured-inputs.md) for the original module evidence and [release verification](reviews/release-verification.md) for integration checks.
