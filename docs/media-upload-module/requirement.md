MEDIA UPLOAD MODULE REQUIREMENT
Purpose-based upload, client-side crop/compress, purpose tabs, attach-on-upload

STATUS
Approved for development. Backend image processing is intentionally excluded.

REGION SCOPE (CURRENT)
India-first implementation. Version 1 is not released, so no data migration is needed.

OBJECTIVE
Today every image/video is uploaded to one flat library with no size guidance, and the original file (up to 5 MB) is stored and shown everywhere. Tenants need to be told what to upload, get images prepared to the right ratio and size automatically, find images by purpose, and optionally tag an image to a product, category or pack while uploading.

SCOPE
- Purpose selection for every image upload: PRODUCT, CATEGORY, PACK.
- Ratio check, then Fit / Fill / Manual crop to the purpose ratio.
- Client-side resize + compress before upload, with before/after preview.
- Low-resolution warning (does not block).
- Media Library tabs per purpose. Upload follows the active tab.
- Pickers inside forms locked to their own purpose.
- Optional "Attach to" step at upload (Media Library page only).
- Videos: unchanged. Own tab, no ratio, no crop.

OUT OF SCOPE
- Logo and banner. They keep their own upload place (storefront config) and are not part of this flow or the library tabs.
- Any server-side image processing, resizing, or compression. API keeps current checks only.
- Watermark or overlay on images.
- Customer-web display-time resizing (Cloudinary URL transforms, srcset). Separate task.
- Migration of existing assets.
- Sharing one image across purposes (see Business Rules).

PRIMARY USERS
- Tenant users with media.upload permission (org_admin and roles granted it).
- Platform admin (uploads platform-shared images using the same flow).

----------------------------------------------------------------
1. PURPOSES AND IMAGE RULES
----------------------------------------------------------------

| Purpose  | Ratio | Output size | Warn below | Used by                          |
|----------|-------|-------------|------------|----------------------------------|
| PRODUCT  | 1:1   | 1200 x 1200 | 800 x 800  | Group images, variant images     |
| CATEGORY | 1:1   | 600 x 600   | 400 x 400  | Category form                    |
| PACK     | 4:3   | 1200 x 900  | 800 x 600  | Pack form                        |

Rules
- Ratio match tolerance: +/- 2%.
- Output format: WebP, quality about 85. Fallback to JPEG if the browser cannot encode WebP.
- Never upscale. A smaller image keeps its own size and gets the low-resolution warning.
- GIF is not accepted in this flow (canvas processing drops animation). Accepted inputs: JPEG, PNG, WebP.
- Source file limit before processing: 20 MB. The processed file must still pass the API limit of 5 MB.
- Config for the table above lives in one shared constant (see Development), not repeated per screen.

Why these values (from customer web analysis)
- Product images render 1:1 up to full phone width on the detail page (about 390 CSS px, up to about 1290 px at 3x), and 1:1 / 1:0.82 / 1:0.85 on cards with object-fit cover. Square with the subject centered is the safest shape.
- Category images render in 1:1 boxes, largest about 127 CSS px (about 380 px at 3x).
- Pack images render 4:3 (3:2 on small screens) in the featured carousel and as a 96 px card thumbnail.

----------------------------------------------------------------
2. UPLOAD FLOW
----------------------------------------------------------------

Step 1 - Purpose
- Purpose is taken from the active Media Library tab, or from the form that opened the picker.
- The library has only the three purpose tabs (plus Videos), so the purpose is always known. No purpose question is shown to the user.

Step 2 - Select files and prepare
- User selects one or more files (drag and drop or click).
- For each file the tool reads pixel size and shows the target ("Product: 1:1, 1200 x 1200").
- Ratio matches (within tolerance):
  - Accepted as is. Resized to the output size and compressed. No crop screen.
- Ratio does not match: user chooses one of
  - Fit (default): whole image kept, white padding added to reach the ratio. Nothing is cut.
  - Fill: center-crop to the ratio.
  - Manual crop: drag and zoom inside a box locked to the ratio.
- Every file shows a before/after preview with final dimensions and file size so the user can judge quality. User can replace or remove the file before saving.
- Low-resolution warning: "This image is 300 x 300. Recommended 1200 x 1200. It may look blurry." Warning only.
- Multiple files: each row shows its own status; bulk actions "Fit all" and "Fill all" apply to the non-matching rows.
- Transparent PNGs: Fit pads with white; output stays WebP (white background expected for products).

Step 3 - Attach to (optional, Media Library page only)
- See section 4.

Step 4 - Upload (and attach)
- Each processed file is uploaded with its purpose. If targets were chosen, the attach calls run after the uploads finish.
- Uploads run one by one. If the plan library limit is reached (FEATURE_LIMIT_EXCEEDED), the server message is shown and the remaining files are not sent (marked failed).
- Result is reported per file for upload (Uploaded / Failed with reason) and per target for attach (Attached / Not attached with reason).
- Failures are per file; one failure does not stop the others, except the plan-limit stop above.

----------------------------------------------------------------
3. MEDIA LIBRARY AND PICKERS
----------------------------------------------------------------

Media Library page
- Tabs: Products | Categories | Packs | Videos.
- Each image tab lists only assets with that purpose. Existing cards (name, dimensions, size, delete) are unchanged. Search and the count are per tab.
- The Upload button uses the active tab's purpose and ratio rules.
- The recommended-size hint text changes with the tab.
- Videos tab: current behavior, no purpose, no crop.
- Plan media limits (media.upload max_images / max_videos) keep working as today.

Pickers inside forms (gom-image-picker)
- Each form locks the picker to one purpose. No tabs and no "show all".
  - Category form: CATEGORY
  - Group edit, group wizard, quick-create group, variants: PRODUCT
  - Packs: PACK
- Uploading from inside a picker runs the same prepare/crop/compress flow with that purpose.
- The attach step is hidden in pickers (the form is already the target and returns the asset as today). It is also hidden in the group wizard and quick-create because the group does not exist yet.
- Platform-shared images are listed with the same purpose filter.
- Videos in the product/pack pickers keep working as today.

----------------------------------------------------------------
4. ATTACH TO (ON UPLOAD)
----------------------------------------------------------------

Where: Media Library page only, optional step.

| Purpose  | Target selector                                                        | Attach call                                             |
|----------|------------------------------------------------------------------------|---------------------------------------------------------|
| PRODUCT  | Searchable groups (attribute, measured, hybrid) with variants nested. Select a group gallery and/or one or more variants. | PATCH /groups/:id/images/attach, PATCH /variants/:id/images/attach (existing) |
| CATEGORY | Searchable category dropdown, single select                            | Set category imageAssetId (category update)             |
| PACK     | Searchable pack dropdown                                               | PUT /packs/:id with { images } (existing images + new ones; no asset id is stored on packs) |
| Skip     | Library only                                                           | none                                                    |

Rules
- One target set applies to the whole batch (every uploaded file is attached to every chosen target). There is no per-file override.
- Hybrid groups: the selector shows the group gallery and each variant as separate targets. The customer app shows the variant image first, then the group image.
- Existing attach limits apply: max images per group (plan limit), one video limit. Violations are reported per file as "Uploaded but not attached: <reason>".
- A CATEGORY image replaces the category's existing image. The dialog states this before saving.
- Attach failure never rolls back the upload; the image stays in the library.
- Attaching requires the target's edit permission (group.edit, variant.edit, category.edit, pack.edit). Without it the step is disabled with an explanatory message. Upload itself needs only media.upload.
- Target search and paging are server-side (name / code / SKU). Do not load all groups or variants at once.

----------------------------------------------------------------
5. BUSINESS RULES
----------------------------------------------------------------
- One asset has exactly one purpose. To use the same photo for two purposes, the user uploads it twice. Each upload counts against the plan media limit.
- Purpose is immutable after upload.
- Pickers only show assets of their own purpose.
- Assets without a purpose (created before this feature, or by other upload flows such as logo, banner, payment-QR) are not shown in the purpose tabs or pickers. Dev data can be cleaned or re-uploaded; no migration is built.
- Client-side processing is the only processing. The API stores exactly what it receives.
- Tenant isolation, upload security checks (signature, size, abuse limits), and library limits remain enforced by the API.

----------------------------------------------------------------
6. API CHANGES
----------------------------------------------------------------
Media asset model (global-order-management-api/src/models/mediaAsset.model.js)
- Add optional field purpose: enum PRODUCT | CATEGORY | PACK, indexed with tenantId and status.
- Videos: purpose not required.

Endpoints
- POST /api/v1/media/upload: accept optional purpose (form field), validate against the enum, store it. Image uploads from the new flow always send it. Other flows (logo, banner, payment QR) do not send it and keep working.
- GET /api/v1/media (tenant list) and GET /api/v1/media/platform: accept optional purpose query filter in addition to existing mediaType/search/page.
- Validation errors return 400 with a clear message.
- No image transformation in media.service.js (keep upload_stream options as they are).

Gaps to verify and fill (small)
- Search support on group, variant, category and pack list endpoints (needed for the attach selector): verified, already supported. The UI escapes the search term because the shared list filter uses it as an unescaped regex.
- Category image attach: PUT /categories/:id is a partial update; the UI sends name, imageAssetId and imageUrl (imageUrl is only auto-resolved when empty).
- Pack image attach: verified, PUT /packs/:id accepts images alone and replaces the list, so the UI sends the existing images plus the new ones.

Contracts / docs to update
- global-order-management-api/docs/contracts (media contract) and Swagger comments in media.routes.js.

----------------------------------------------------------------
7. DEVELOPMENT BREAKDOWN
----------------------------------------------------------------
Shared UI (global-order-management-ui/src/app/shared/components)
- media-purpose.config.ts: purpose enum plus ratio, output size, minimum size, accepted types, source limit. Single source of truth.
- image-processor (service or util): read dimensions, ratio check, fit / fill / crop to canvas, encode WebP with JPEG fallback, return Blob plus metadata. Pure functions for the math so they are unit-testable.
- image-upload component: extended with purpose input, per-file prepare/preview, Fit/Fill/Manual controls, warnings, per-file status.
- crop dialog/component: drag and zoom with locked ratio. Use a maintained Angular-compatible cropper if available, otherwise a small canvas-based implementation.
- media-attach-target component: server-side searchable selector (groups with variants, categories, packs), used only on the Media Library page.
- image-picker: new input purpose (required), passes purpose to list calls and to the upload component, hides attach step.

Features
- saas-platform/media (Media Library page): purpose tabs, per-tab upload and counts, attach step, result summary.
- Call sites pass purpose: categories-form (CATEGORY); groups, create-group-wizard, quick-create-group, variants (PRODUCT); packs (PACK).
- media-asset.service and media-asset.model: add purpose to upload, list, and the model.
- Add i18n keys for all new labels, warnings and messages.

API
- Model field, validation, upload and list filter as in section 6, plus any gap fixes.

Rules to follow (docs/dev-rules.md)
- Standalone components, reactive forms where forms are used, no any type, shared table component for lists, minimal comments.

----------------------------------------------------------------
8. NON-FUNCTIONAL REQUIREMENTS
----------------------------------------------------------------
- Processing runs in the browser; a 20 MB photo should be processed without freezing the UI (use createImageBitmap / OffscreenCanvas where available; show a processing indicator per file).
- Preview must show the exact bytes that will be uploaded (final dimensions and size).
- Mobile and tablet browsers: touch support for crop drag and zoom.
- Accessibility: tabs, buttons and crop controls reachable by keyboard; warnings are text, not color only.
- Audit: existing upload audit/security logging continues; purpose is stored on the asset.

----------------------------------------------------------------
9. ACCEPTANCE CRITERIA
----------------------------------------------------------------
1. Upload from the Products tab sets purpose PRODUCT; Categories sets CATEGORY; Packs sets PACK. No purpose question is asked.
2. A 1200 x 1200 image on the Products tab uploads with no crop step; a 1000 x 1500 image shows Fit / Fill / Manual options.
3. Fit adds white padding with no cropping; Fill center-crops; Manual crop is locked to the purpose ratio.
4. Output is 1200 x 1200 (PRODUCT), 600 x 600 (CATEGORY), 1200 x 900 (PACK), WebP, and is smaller than the 5 MB API limit for a 20 MB source photo.
5. A 300 x 300 image on the Products tab shows the low-resolution warning and can still be uploaded.
6. Each tab and each form picker lists only its own purpose; a category image never appears in a product picker.
7. Uploading with an attach target links the asset to the group, variant, category or pack and reports the result per file.
8. If attach fails (full group, no permission, deleted target), the image stays in the library and the row shows the reason.
9. Attach step is absent in form pickers, group wizard and quick-create.
10. Logo, banner and payment-QR uploads still work unchanged.
11. API rejects an invalid purpose with 400; uploads without a purpose (legacy flows) still succeed.
12. Library plan limits (images, videos) are still enforced.

----------------------------------------------------------------
10. TEST PLAN
----------------------------------------------------------------
Unit (UI, Jest)
- Ratio check with tolerance; fit and fill math; never-upscale; output dimensions per purpose.
- Purpose filter in picker and library tabs.
- Attach result mapping (success, partial failure, no permission).

Unit (API, Jest)
- Upload with valid, missing, and invalid purpose.
- List filter by purpose for tenant and platform endpoints.
- Legacy upload without purpose.

Manual
- Large phone photo (12 MP, 8 MB), PNG with transparency, tiny image, portrait and landscape images, multi-file mix of matching and non-matching ratios, mobile browser crop gesture.

----------------------------------------------------------------
11. OPEN ITEMS TO CONFIRM DURING DEVELOPMENT
----------------------------------------------------------------
- How pack images are persisted and whether a pack attach endpoint is needed.
- Whether category update already resolves imageUrl from imageAssetId on every save (category.service.js does this when imageUrl is empty).
- Whether group, variant, and pack list endpoints support server-side search and paging, or need it added.
- Whether the Media Library page is also used by other roles that lack group/variant edit permission (attach step must degrade gracefully).
- Cropper library choice (compatibility with the Angular version in package.json) versus a custom canvas implementation.

----------------------------------------------------------------
12. FUTURE PHASES
----------------------------------------------------------------
- Customer web: request resized/optimized variants per surface (Cloudinary f_auto, q_auto, width/height) and add srcset, so the stored 1200 px image is not downloaded for 48 px thumbnails.
- Admin hints for logo and banner: align the banner recommendation (admin says 5:2 at 1500 x 600; the customer app renders 2.1:1).
- Optional crop guide overlay (safe-area box) in the crop dialog.
- Optional bulk re-processing of existing library images.
