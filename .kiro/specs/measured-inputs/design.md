# D — Design

## Existing model boundary

Helpers import `Scenario`, `ServiceNode`, `arrivalStreamSchema`, `serviceDurationSchema` and `idSchema` from the existing schemas. `Provenance` is an alias of the existing duration provenance; no new persistence format is introduced. Arrival records keep seconds in `arrivalTime`; empirical durations keep every second-valued sample in input order.

## Parsing and validation

`src/features/data-sources/index.ts` reads comma-separated or header-detected tab-separated text with quoted fields. Cells retain physical line and one-based field-column locations. Fully blank lines do not represent data records; populated, malformed and delimiter-only rows are counted and validated. Header and row-width failures cannot produce an applicable preview. ID, time and attribute validation reports structured diagnostics. Samples use the existing schema bound. Immutable previews contain converted data and summaries; builders reject errors and run the existing schemas before returning fresh objects.

`createArrivalTemplate(attributes)` generates all `attr:` columns and allowed example values, quoting cells when needed. `createServiceTemplate()` supplies a labelled synthetic example in the UI and documentation. Unit selection remains mandatory for both.

## Draft lifecycle

Each editor owns text, units, provenance and a validated preview. Text/file/unit changes clear the preview and change provenance to `user_estimate`; source/notes survive. Provenance-kind selection is enabled only on a valid current preview. Invalid provenance blocks Apply. Cancel restores the passed value's metadata and clears import state. Target/input changes reset the local editor. Asynchronous reads use a request token so older uploads cannot overwrite newer drafts.

Explicit Apply builds from the frozen preview and calls `onChange` once. It never writes storage or runs simulation. `ProvenanceFields` is a controlled field group; it calls its parent only with metadata drafts. `updateProvenance(previous, change)` separates numeric value changes from text-only edits and explicit kind selection.

## Independent lab and integration

The lab keeps `committed` and `draft` project objects. Editor callbacks replace only the matching stream or selected service duration within `draft`. The outer Apply validates the complete project before committing it. Discard restores `committed` and resets pending editor drafts; export serializes only `committed` with the existing codec. Two plans continue sharing one scenario.

E embeds the arrival editor in B's ScenarioEditor and service/source fields in Inspector, routing callbacks to their existing form draft. E must supply stable target identity (including service/plan ID as the component key where necessary), retain outer Apply, and use the provenance helper for manual numeric edits. No DOM/global-variable integration shortcuts or new modal are used.

## Verification boundary

Unit tests exercise pure parsers, schema limits, immutability, provenance transitions and model/codec reuse. D's browser script uses the existing A0 Playwright installation without editing package, locks or public browser configuration. It exercises the Vite lab with uploads, pasted input, cancellation, errors, metadata, export, desktop and narrow viewports. Production build still follows the existing application entry; the lab is a dev-server review entry, not a deployed Pages route.
