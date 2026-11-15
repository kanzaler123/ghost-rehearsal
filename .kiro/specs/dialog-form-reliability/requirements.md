# Dialog and form reliability (B)

Scope: `Dialogs.tsx`, `Inspector.tsx`, local forms modules, B tests and records. Preserve public props and the existing application data flow. Integration target: `kiro/release-integration`.

1. The newest modal owns visible stacking, focus, pointer interaction and Escape. Closing an import error returns to Import; a second Escape closes the welcome dialog. Workbench shortcuts cannot act through a modal.
2. Tab and Shift+Tab include only current visible, enabled controls. Dynamic removal restores focus inside the same modal; closing restores the trigger or a valid adjacent control.
3. At 390×568, 390×844 and 1280×720, both languages support new event, scenario, resources, JSON, template saving and renaming. Content and long errors scroll while the footer remains reachable by keyboard and pointer.
4. Numeric text is a local draft. Empty/partial/invalid drafts never emit NaN, Infinity or an accidental zero. Blur and Enter commit valid numbers; Enter edits the field without submitting its form. Invalid drafts have associated bilingual explanations and block Apply/Create. External value changes and entity switches reset drafts.
5. Count fields use integer steps; duration/probability fields retain their own units and precision. Minutes are displayed to four decimals and converted to seconds to millisecond precision; 1.5 minutes is 90 seconds. Optional blank fields retain unset/unlimited semantics.
6. Resources tabs activate automatically with Left/Right/Home/End, use one tab stop, reference labelled panels and preserve drafts across switches. Invalid hidden fields are revealed when Apply is attempted.
7. Inspector checkbox sets use named groups and independent item labels. Text and Space toggle only the intended item.
8. Cancel/Escape discard dialog drafts. A successful Apply invokes its callback once. Tests, review evidence and tool attribution report actual outcomes, including the pending A0 infrastructure dependency.
