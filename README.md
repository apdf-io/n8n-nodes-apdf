# n8n-nodes-apdf

An n8n node for [Apdf](https://apdf.io) — the PDF engagement layer for apps and agents.

Share a PDF as a per-recipient tracking link, then find out who opened it, which pages they
actually read, how long they stayed and what they typed into its forms. The same node also
covers the full Apdf PDF toolset: create, merge, split, compress, OCR, encrypt and page
operations.

[n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/reference/license/)
workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Nodes](#nodes)
- [Apdf Trigger](#apdf-trigger)
- [Apdf](#apdf)
- [Asynchronous operations](#asynchronous-operations)
- [Page ranges](#page-ranges)
- [Resources](#resources)

## Installation

Follow the
[community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
and install `n8n-nodes-apdf`.

## Credentials

The nodes authenticate with an Apdf API token.

1. Sign in at [apdf.io](https://apdf.io) and open **Dashboard → API → Tokens**.
2. Create a token and copy it. A token belongs to one workspace, so every request through
   this node acts on that workspace.
3. In n8n, create new **Apdf API** credentials and paste the token.

The **Base URL** field defaults to `https://apdf.io/api` and only needs changing if you run
Apdf on another host.

Apdf sends the token as `Authorization: Bearer <token>`. The credential test calls
`GET /docs`, so a valid token with an accessible workspace returns success immediately.

## Nodes

This package ships two nodes:

| Node             | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| **Apdf Trigger** | Starts a workflow when someone interacts with a PDF you shared       |
| **Apdf**         | Reads engagement data and runs PDF operations                        |

## Apdf Trigger

The trigger receives the webhook that an Apdf automation sends when a reader does something.

### Setup

The trigger registers itself. Pick the events you care about and activate the workflow — the
node creates the matching automation in Apdf, and deletes it again when you deactivate.

1. Add the **Apdf Trigger** node and select your **Apdf API** credentials.
2. Choose one or more **Events**.
3. Optionally restrict it to certain **Documents** by ID, and add **Conditions** such as
   *page number equals 7*.
4. Activate the workflow. The automation appears under **Documents → Automations** in Apdf,
   named after your workflow.

Nothing needs creating by hand. If you delete the automation in Apdf, deactivating and
reactivating the workflow recreates it.

Under **Options** you can set an **Auth Header Value**. The node sends it to Apdf as a
webhook header and rejects any incoming request that does not carry it — worth setting, since
the webhook URL is otherwise the only thing protecting the endpoint.

### Events

Choose at least one event. Apdf filters on its side, so the workflow only runs for what you
selected.

| Event                | Fires when                                          |
| -------------------- | --------------------------------------------------- |
| Document Opened      | A viewer opens the PDF                              |
| Document Downloaded  | A viewer downloads the PDF                          |
| Document Printed     | A viewer prints the PDF                             |
| Page Viewed          | A viewer navigates to a page                        |
| Page Read            | A viewer stays on a page, measured every 15 seconds  |
| Page Left            | A viewer navigates away from a page                 |
| Text Copied          | A viewer copies text from the PDF                   |
| Link Clicked         | A viewer clicks a link in the PDF                   |
| Form Submitted       | A viewer submits a form in the PDF                  |
| Annotation Created   | A viewer creates an annotation                      |
| Annotation Updated   | A viewer modifies an annotation                     |
| Annotation Deleted   | A viewer removes an annotation                      |

Document and page events — opened, downloaded, printed, viewed, read and left — trigger an
automation **once per reading session**, even where the underlying measurement repeats. Page
Read is measured every 15 seconds, but your workflow runs once for that session. Text Copied,
Link Clicked, Form Submitted and the annotation events fire every time they happen.

### Output

The trigger emits the automation payload unchanged:

```json
{
  "automation": { "id": "…", "name": "Notify on read" },
  "document": {
    "doc_id": "…",
    "name": "Proposal.pdf",
    "viewer_url": "https://…",
    "file_pages": 12
  },
  "trigger": { "matched_event": "page:read", "conditions_evaluated": true },
  "event": {
    "session_id": "…",
    "viewer_id": "…",
    "recipient": { "name": "Jane Doe", "email": "jane@example.com" },
    "data": { "page": 5, "duration_ms": 45000 }
  },
  "session": { "total_duration_ms": 182000, "pages_viewed": 8, "completion_rate": 0.67 },
  "timestamp": "2026-07-28T12:00:00+00:00"
}
```

`event.data` varies by event. Page events carry `page` and `duration_ms`, `link:clicked`
carries the `url`, `form:submit` carries the submitted `fields`, and annotation events carry
the annotation `type` and comment. Document open, download and print events have no extra
data.

### Example

Alert your team the moment a prospect reads your pricing page:

1. **Apdf Trigger** — event **Page Read**, **Documents** set to the proposal's ID, and a
   **Condition** of *page number equals* `5`.

   Use a condition rather than an IF node downstream. The automation fires once per reading
   session, on the first Page Read that satisfies its conditions, so filtering afterwards in
   n8n would usually see a different page and never match.
2. **Slack** — post `{{ $json.event.recipient.name }} just read page
   {{ $json.event.data.page }} — {{ $json.session.pages_viewed }} pages in
   {{ $json.session.total_duration_ms / 1000 }}s`.

### Conditions

| Condition                     | Tests                                          |
| ----------------------------- | ---------------------------------------------- |
| Page Number Equals            | The page the event happened on                  |
| Time on Page At Least         | Seconds spent on that page                      |
| Total Reading Time At Least   | Seconds spent in the whole session              |
| Pages Viewed At Least         | How many distinct pages were seen               |
| Completion Rate At Least      | Percentage of the document read                 |

Not every condition works with every event — a page condition needs a page event, for
instance. Apdf validates the combination when the workflow is activated and returns a clear
error if it cannot work.

## Apdf

Wherever an operation needs a document, the node offers a **Document Name or ID** dropdown
populated from your workspace — pick one, or supply an ID with an expression when it comes
from an earlier node.

List operations follow the n8n convention: **Return All** fetches every page, or leave it off
and set a **Limit**. Responses are unwrapped, so each record arrives as its own item rather
than as one item holding the whole response.

### Document

Create, list, get and delete tracked documents, archive and unarchive them, and switch a
document between public and link-only access.

Creating a document takes a publicly reachable **File URL** and a **Name**.

### Tracking Link

Mint one link per recipient so that reading activity is attributed to a person rather than an
anonymous viewer. Create, list, delete, activate and deactivate links.

A **Recipient Name** is required; **Recipient Email** is optional.

### Analytics

| Operation             | Returns                                                             |
| --------------------- | ------------------------------------------------------------------- |
| Get KPIs              | Sessions, viewers, completion rate and downloads for a document     |
| Get Sessions          | The reading sessions recorded for a document                        |
| Get Session           | One session, including its per-page detail                          |
| Get Annotations       | Highlights and comments readers left                                |
| Get Form Submissions  | What readers typed into the document's forms                        |

### PDF

Eighteen operations over the Apdf PDF API: **Create From HTML**, **Merge**, **Split**,
**Compress**, **Convert to Image**, **Extract Pages**, **Delete Pages**, **Rotate Pages**,
**Overlay Pages**, **Underlay Pages**, **Search Content**, **Read Content**, **OCR
Convert**, **OCR Search Content**, **OCR Read Content**, **Add Security**, **Remove
Security** and **Read Metadata**.

Every operation takes its source as a publicly reachable URL and returns a new file. None of
them modify the source, including **Delete Pages**.

### Automation

Full control over the rules that turn reader activity into webhook calls: **Create**, **Get**,
**Get Many**, **Delete**, **Activate**, **Deactivate**, **Duplicate**, and **Get Executions**
for the delivery history.

Creating one takes a **Name**, one or more **Events** and a **Webhook URL**. Set **Scope** to
*Specific Documents* to narrow it to given IDs, add **Conditions** to fire only past a
threshold, and add **Webhook Headers** so your endpoint can authenticate the call.

If you only want a workflow to react to readers, use the **Apdf Trigger** instead — it creates
and removes its own automation. Use this resource when you are managing automations
programmatically, for instance pointing them at systems outside n8n.

### Job

**Check Status** polls an asynchronous operation for its result.

## Asynchronous operations

Apdf runs heavy work on a queue. Six operations always return a job ID instead of a result:

- Create From HTML
- Compress
- Convert to Image
- OCR Convert
- OCR Read Content
- OCR Search Content

The remaining PDF operations run inline by default, and return a job ID only when you enable
**Run Asynchronously** under **Options**.

To get the result of a job, either poll it with the **Job → Check Status** operation, or set
a **Webhook URL** so Apdf calls you when the job finishes.

## Page ranges

Operations that take a **Pages** value accept page numbers and ranges, for example `1,3-5`.
Two shortcuts are available:

- `z` — the last page
- `rN` — the Nth page from the end, so `r2` is the second-to-last page

**Split** additionally accepts `nN`, which splits into files of N pages each. `n2` yields
files of two pages.

## Resources

- [Apdf documentation](https://apdf.io/docs)
- [Apdf MCP server](https://apdf.io/product/pdf-mcp-server) — for agent access rather than
  workflow steps
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE)
