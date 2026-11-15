# Design

- Keep existing editor and worker launch path. App owns a small guide state (step, original A/B IDs, optional C ID, selected visitor ID); a guide panel supplies context/actions and invokes existing journey/evidence views.
- Use `addEvent` for an independent copy of the built-in example. Launch actual plans through the existing Worker. Guest selection is based on `featuredGhost`; first difference comes from recorded, basis-clipped journeys, not hard-coded times or IDs.
- Reuse Insights for positive-duration backlog/post/resource records. Prefer the added checking lane for explaining A/B constraints and show the packing station before creating C.
- Preserve original plan names/IDs throughout the guide. Explain that the generic comparison's left/right A/B labels mean original B/C in the last step.
- Export explicitly targets C; no dependence on which plan is currently selected on the left. Include the B/C evidence contract and C's operational rules.
- Reset returns to original A/B and keeps C; rerun uses current plan inputs. Leaving/switching to free editing does not erase project data.
- Playwright launches the built application, observes real Worker creation, checks rendered outcomes and downloads, and saves browser evidence. CI runs the same tests without deploying feature branches.
