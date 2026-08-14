# UX Preview Notes

- Main workspace preview renders successfully at `http://localhost:3000` with the new IDE-style header, Search requests command center, environment selector, Agent and Settings actions, request tabs, welcome state, request editor and response panel.
- The splash preview at `http://localhost:3000/splash` renders successfully with a dark graphite background, subtle grid, centered O/ mark, orbit treatment, ONYX wordmark, progress line and native-workspace status label.
- The app remains monochrome with restrained blue-gray depth and no vibrant accent colors.
- Browser devtools indicators are preview-only and are not part of the Tauri production window.

## Settings Preview

The Settings modal opens as a centered, keyboard-friendly panel with a left navigation rail containing General, Editor, Notifications, Agent and About categories. The General section exposes theme, density, sidebar width, tab restoration, welcome guidance and workspace restoration controls. The modal retains a shared Save settings action and keeps the main workspace visually subdued behind the panel.

## Editor and Notification Preview

The Editor category exposes font size, tab size, word wrap and keyboard-first shortcut guidance. The Notifications category clearly explains that feedback is rendered by Onyx inside the desktop window rather than through browser notifications, and exposes enable notifications, request completion, error alerts and reduce motion controls.
## `.onyx` Differentiator Preview
- Main workspace exposes Review, Notebook, and Replay actions in the IDE toolbar.
- Notebook modal opens successfully from the toolbar and shows `.onyx` branding, title editing, Save `.onyx`, current request insertion, latest response insertion, markdown notes, local-only safety text, and block removal.
- `.onyx` content is intentionally handled by the Onyx document parser rather than the regular collection JSON importer.
- Static preview loaded successfully at `http://localhost:3000/` and the Notebook modal was visually verified in the browser preview.

## Final Differentiator UI Verification
- 2026-08-14 local browser preview confirmed that the IDE toolbar exposes the Review, Notebook, and Replay controls alongside Agent and command-palette access.
- The Notebook action opens the branded `.onyx` local runbook modal. It exposes title editing, Save `.onyx`, current-request capture, latest-response capture, markdown note insertion, selected-block removal, and a clear notice that `.onyx` documents are not regular collection JSON.
- The preview’s local-app-data fallback state continues to render the complete workspace without a cloud dependency.
- The current-request action added a typed request block to the notebook, and Save `.onyx` completed successfully with an Onyx in-app confirmation for `List-users-Notebook.onyx`.
- The command palette lists `Open Onyx notebook (.onyx)`, `Create API notebook (.onyx)`, `Review collection changes`, and `Open Request Time Machine`; the corresponding toolbar actions remain visible in the workspace.

