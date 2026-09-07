# GRIMOIRE // HIVE

A living digital grimoire: memory is a page, a relationship is a synapse, and a command is an intention made actionable. Original geometry, no franchise artwork.

## Authority

The user's Neuro-Grimoire specification is the visual source of truth. The ui-ux-pro-max immersive-interface pattern and React state guidance inform accessibility and implementation. Its generic cyan/magenta palette and Inter typography are deliberately superseded by the specified tokens below.

## Color and type

| Role | Token |
|---|---|
| Void / background | #050507 |
| Abyss / secondary surface | #0B0D12 |
| Obsidian / controls | #11141A |
| Intelligence | #53FFB0 |
| Secondary intelligence | #087A58 |
| Knowledge and memory | #D7B46A |
| High-priority knowledge | #FFE6A3 |
| Reasoning | #9C7CFF |
| Error and destruction | #FF4D68 |
| Primary text | #E9FFF6 |
| Secondary text | #91A59D |
| Muted readable labels | #85958E |

Space Grotesk for UI and responses; IBM Plex Mono for telemetry and small uppercase labels; Cinzel only for the entity name and ceremonial headings. The originally suggested #53615C is too dim for normal text: use it only for decorative geometry, not meaningful labels.

## Composition

Desktop: narrow chapter rail, visually dominant consciousness core, asymmetrically offset Hive/memory rail, bottom navigation. Tablet retains the chapter rail and removes the secondary rail. Mobile becomes a single-column portable Grimoire with labeled bottom navigation. Content areas scroll without covering the navigation.

One bright focal point. Keep gold restrained, surfaces dark, edges fine, and corners slightly asymmetric. Spectral book pages use shallow perspective and a central binding. All geometry is authored SVG or canvas.

## Interaction and motion

The core is a semantic button: activate voice on click or keyboard, open commands on long press/context menu, interrupt on double click. A visible command button provides the long-press alternative. Microphone use requires an explanatory permission seal and a user action. Typed commands are always available.

Command state comes from actual activity: awakening (900 ms presentation), aware, listening, reasoning while a search request is in flight, speaking during speech synthesis, fault when search fails. No invented confidence percentages, execution results, online agents, or synthetic memory counts. Hive nodes and edges come from /api/graph; the home preview is bounded to 120 nodes and the full explorer to 500.

Core orbiting/breathing is a user-requested presence effect; edge packets run during active search. Respect prefers-reduced-motion, provide a persistent pause switch, and stop canvas work in hidden tabs. Canvas resolution is capped at 2×; animation targets a bounded 30 FPS for quiet background rendering, with compositor-driven core transforms.

## Accessibility and boundaries

Use visible state words alongside color. Native modal dialogs provide focus containment, Escape dismissal, and return focus. Every icon button has an accessible name. Provide a keyboard node picker alongside canvas interaction, explicit zoom/reset buttons, a skip link, and a high-contrast option. Voice is opt-in, never a wake-word listener. Browser speech recognition may use the browser provider's remote service.

Existing backend persistence/search/council/settings are retained. The interface does not introduce authentication, distributed execution, background microphone monitoring, or fabricated telemetry. Those require real backend capabilities before receiving an active visual state.
