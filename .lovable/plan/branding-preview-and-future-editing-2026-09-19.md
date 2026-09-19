# Branding Preview and Future Editing

## What will be added
- Turn the current branding form into a draft-first editor: choosing a logo or colours updates only the preview until **Publish branding** is selected.
- Add a full-screen preview with representative **Dashboard**, **Workflow**, and **Customer document** views, plus desktop/mobile switching.
- Show the draft logo, primary colour, and secondary colour consistently across navigation, buttons, status indicators, charts, and document styling inside the preview.
- Keep reset/cancel controls so unpublished changes can be discarded without affecting the workspace.
- Make the same branding editor available under **Settings → Branding** for administrators, while retaining it in Business Configuration for future edits.

## Safety and access
- Only workspace administrators can publish branding changes.
- A new logo remains local until publishing succeeds; the previous stored logo is removed only after the new branding is saved.
- Existing saved branding remains active for every team member until publication completes.

## Technical details
- Add a reusable branding preview dialog and a shared draft model for logo URL and colour values.
- Refactor the existing branding card to stage file selections with a temporary browser URL, validate colours/files, publish the logo and colours together, and clean up temporary URLs.
- Reuse existing design tokens so previewed colours match the actual application after publishing.
- Add the branding tab conditionally to Settings for administrators and reuse the same editor component there.
- Verify type safety, the preview build, and desktop/mobile preview behavior.
