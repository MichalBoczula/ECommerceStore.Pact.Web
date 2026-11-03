# Registry explorer (WEB/04)

The explorer reads the reviewed WEB/02 API through the WEB/03 repositories. It reuses the approved
Pact typography, spacing, white cards, blue accents and Material controls. The design's example
identities and outcomes are not application data. No contract publishing or verification evaluation
is available in the browser.

## Routes and filters

| Route | Selection and supported filters |
| --- | --- |
| `/applications` | Registered application discovery; `search` is an application-ID prefix |
| `/applications/:applicationId` | Registered versions for that application |
| `/applications/:applicationId/versions/:commitSha` | One exact registered version |
| `/dependencies` | Directed declarations; `applicationId` (either role), `consumerApplicationId`, `providerApplicationId` |
| `/dependencies/:consumerApplicationId/:providerApplicationId` | One directed integration declaration |
| `/contracts` | Publications; `sourceApplicationId`, `commitSha`, `consumerApplicationId`, `providerApplicationId`, `kind`, `sourceRef`, `contractSha256` |
| `/contracts/:id` | One immutable publication, its artifact metadata and exact registered source version |

List routes also accept `limit` (1–100, default 25) and the API's opaque `after` cursor. Each list
shows only its returned page count. Next page preserves the filters; First page removes the cursor.
Applying or clearing filters removes the old cursor. Reload and browser back/forward restore URL
filters and selection. Invalid page sizes and repeated query parameters produce a visible validation
error; the API remains responsible for filter syntax and cursor scope validation.

An exact version links to declarations with `sourceApplicationId` and `commitSha` as browsing
context. Those values do not make the application-level integration versioned. The integration
offers separate consumer Pact and provider OpenAPI publication links. It carries the selected commit
only to publications from that same source application; browsing the other role shows all registered
source versions until the user chooses an exact filter. Provider schema browsing does not impose a
consumer filter, since provider publications have no consumer identity.

## Evidence and user states

All commit SHAs, contract hashes, IDs, source refs, image digests, publishers, timestamps and CI build
URLs remain available in full. GitHub repository URLs have exact commit links. External provenance
links allow only HTTP(S) without embedded credentials, use a new tab with `noopener noreferrer`, and
otherwise render the supplied value as text. No external diagnostic text becomes HTML.

Publication details load the referenced artifact and exact source version. A mismatched artifact
hash or source identity fails visibly instead of attaching unrelated provenance. Download original
artifact fetches the original ArrayBuffer, then saves it as an octet-stream Blob with a local filename.
There is no JSON parsing/reserialization, embedded artifact preview or direct trust in an API-supplied
download URL. The Blob URL is revoked after the browser starts the download. Failed downloads offer
a retry without claiming success.

Loading, successful empty pages, missing records, unavailable registry, validation errors and invalid
responses are distinct states. Error panels retain trace IDs and field errors from the transport's
safe mapping. A refresh retries the current explicit selection. Changing selection cancels the prior
read and clears stale records; leaving the explorer also cancels downloads. Declared integrations and
contract publications do not carry inferred verification or compatibility badges. The graph itself
arrives in WEB/08.

## Verification boundary

Unit tests cover repository orchestration, exact provenance, invalid URL selections, cancellation,
retry, serialization-safe errors, download concurrency and safe external links. Browser tests exercise
the application-to-publication flow, exact downloads, provider-specific selection, cursor/filter
history, empty/error/loading states, mobile wrapping, navigation and axe accessibility. Transport
fixtures live under `tests/fixtures`; they are not bundled or presented as live evidence.

These checks use controlled HTTP responses and the actual generated client. The separate proxy test
uses a local HTTP server. Full browser/API/MongoDB acceptance remains WEB/09, and hosted source-CI
acceptance remains WEB/12. WEB/04 does not publish images or deploy Azure infrastructure.
