# Design

- Keep existing editor and worker launch path. App owns a small guide state (step, original A/B IDs, optional C ID, selected visitor ID); a guide panel supplies context/actions and invokes existing journey/evidence views.
- Use `addEvent` for an independent copy of the built-in example. Launch actual plans through the existing Worker. Guest selection is based on `featuredGhost`; first difference comes from recorded, basis-clipped journeys, not hard-coded times or IDs.
- Reuse Insights for positive-duration backlog/post/resource records. Prefer the added checking lane for explaining A/B constraints and show the packing station before creating C.
- Preserve original plan names/IDs throughout the guide. Explain that the generic comparison's left/right A/B labels mean original B/C in the last step.
- Export explicitly targets C; no dependence on which plan is currently selected on the left. Include the B/C evidence contract and C's operational rules.
- Reset returns to original A/B and keeps C; rerun uses current plan inputs. Leaving/switching to free editing does not erase project data.
- The comparison overview and workbench own guide entry; the guide does not extend B's EventCreator/Dialogs interface. A → B means original → alternative; C copies B and adds one packing worker/post. The selected guest, not an obsolete guide selection, is used when jumping to the first difference.
- Playwright launches the built application, observes real Worker creation, checks rendered outcomes and downloads, and saves browser evidence. CI runs the same tests without deploying feature branches.
