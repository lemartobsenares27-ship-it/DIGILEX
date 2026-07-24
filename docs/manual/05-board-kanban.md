# Module 5 — Board (Kanban)

*Source: User Manual – LHIKE ERP: Kanban Board (updated 12:32 pm, March 19, 2024); User Manual – LHIKE ERP: Kanban Board (Settings) (updated 1:15 pm, March 19, 2024).*

## 5.1 Learning Objectives

After completing this module, the reader will be able to:

- Explain what a Kanban board is and why LHIKE ERP includes one alongside its logistics/finance/HR modules.
- Create, search, sort, and update a "story" (task/work item) on the Kanban Board.
- Set a story's priority and track its progress through comments and status changes.
- Customize the board's column names to match a team's own workflow vocabulary.

## 5.2 Business Purpose

**Why this module exists.** "A Kanban Board serves as a helpful visual aid for project management, aiding teams in visualizing their task and monitoring their advancement. The term 'kanban' originates from Japanese and translates to 'signboard' or 'visual signal.'" LHIKE ERP embeds this directly in the ERP so that task/workflow tracking lives alongside the operational data it's often about (e.g., a story tied to a logistics or finance issue) instead of in a separate project-management tool.

**How it helps the business.** Any department — not just software teams — can track a piece of work (a story) from **To Do** through **Finished** with visible ownership, a target date, and a running comment log, without leaving the ERP.

**Who uses it.** Any employee assigned work; managers/admins who assign work and monitor status.

**Departments involved.** All departments — the Board is cross-functional by design.

**Dependencies.** Stories can be assigned **By Department** (referencing departments configured in the Finance module's Settings – Department, see Module 6) or to a **Custom** individual user.

## 5.3 Concepts

**Story.** The Kanban Board's unit of work — a task or work item with a title, rich-text description, optional file attachment, target date, and assignment.

**Column vs. Stage.** By default, the board's five stages are labeled **Story, To Do, In Progress, Testing, Finished** (Module 5 Settings default titles), but "teams can customize column names to suit their unique requirements" via Kanban Board Settings (Section 5.6). A story's current stage is reflected by a checkmark in the corresponding column of the main Kanban table.

**Priority.** Independent of stage — a story also carries a priority level: **No Priority, Critical, High, Medium, Low**, settable from the story's detail view.

**Status update with comment.** Advancing a story's stage is done through a **Change Status** action that requires (or allows) an accompanying comment, creating a running history of who moved the story and why.

## 5.4 Navigation

- **Sidebar:** BOARD > **Kanban Board**, **Settings**.
- **Breadcrumb:** "Kanban ›"

## 5.5 Kanban Board — Feature Breakdown

Numbered to match the source manual's figure callouts.

1. **Sidebar option menu** for the Kanban Board.
2. **Sorting options** (see 5.5.1): Date Created and Target Date range pickers, **Story contains** keyword search, **Assigned To**, **Assigned By**, and **Status** (To-Do/In-Progress/Testing/Finished) filters, plus a **Search** button to apply them.
3. **Add Story** button (top right) — opens the new-story form.
4. **Table** — Story list with No., Date Created, Story (title, clickable link to the story's detail view), Target Date, and one checkmark column per stage (**To Do, In Progress, Testing, Finished**) showing where the story currently sits, plus a **Status** action button.
5. **Pagination.**

### 5.5.1 Sorting/Searching Stories

- **2.1** Date Created / Target Date — pick a specific range for either field.
- **2.2** Story contains — free-text keyword search on the story title.
- **2.3 / 2.4** Assigned To / Assigned By — filter by the user the story is assigned to, or by who assigned it.
- **2.5** Status — filter to only To-Do, In-Progress, Testing, or Finished stories.
- **2.6** Search button — confirms the combined filter selection.

### 5.5.2 Add New Story

- **3.1** Story title and rich-text Description (formatting toolbar included) — freely customizable body text.
- **3.2** Upload — attach a supporting file to the story.
- **3.3** Target Date — a calendar picker for the story's due date.
- **3.4 / 3.5** Assigned To — choose **By Department** (select a configured department) or **Custom** (select one or more specific users).
- **3.6** Submit / Cancel.
- **3.7** A success prompt confirms the story was added.
- **3.8** The new story appears at the top of the Kanban table.

### 5.5.3 Story Detail — Information and Status Update

- **4.1** Story information (title + description, with any uploaded attachment linked below it).
- **4.2** Priority/status quick-view badge.
- **4.3** **Details** panel — Priority (dropdown: No Status/No Priority, Critical, High, Medium, Low), Assignee, Target Date, Created By, Created Date.
- **4.4** **Comments** — a running, timestamped log of comments by different personnel (e.g., "To Do," "in progress," "done" notes left by whoever is progressing the story).
- **4.5** Comment box with **Save / Clear / Back** buttons.
- **4.6–4.9** Success prompts confirm comment posting and priority changes respectively.
- **4.10** Example: setting priority to **Critical** flags the story as needing to be considered first.
- **4.11** **Change Status** overlay — tabs for **To Do / In Progress / Testing / Finished** plus a **Comment** box and **Update / Submit** buttons; this is the mechanism that actually moves the story between stages (distinct from the priority dropdown, which does not move the story).
- **4.12–4.13** A success prompt confirms the status change, and the Kanban table's checkmark columns update to reflect the story's new stage.

## 5.6 Kanban Board Settings — Feature Breakdown

1. **Sidebar option menu** for Kanban Board Settings.
2. **Column-title textboxes** — one editable field per column (**Title for Column 1** through **Title for Column 5**), defaulting to **Story, To Do, In Progress, Testing, Finished** — plus **Submit** and **Back to Kanban Board** buttons.

### Step-by-Step SOP

**SOP 5-1: Rename Kanban Board Columns**
1. **Board > Settings.**
2. Edit any of the five **Title for Column N** fields to match your team's own workflow vocabulary (e.g., renaming "Testing" to "QA Review").
3. Click **Submit**.

**Expected Result.** A success prompt ("Kanban header updated successfully") appears, and the Kanban Board's column headers immediately reflect the new names — the underlying stage logic (a story still occupies exactly one stage at a time) is unchanged; only the labels differ.

**Verification.** Return to the Kanban Board and confirm the new column names are visible in both the table header and the Change Status overlay tabs.

**Common Mistakes.** ⚠ Renaming columns after a team already has stories in flight without communicating the change — stories don't move, only labels change, but staff unfamiliar with the rename may think progress was lost.

**Best Practices.** ✅ Agree on column names as a team before first use, since renaming later requires no data migration but does require re-familiarizing everyone with the new terms.

## 5.7 Real Business Scenario

A logistics coordinator notices a recurring problem with mislabeled parcels and creates a story: "Investigate mislabeling on Courier X shipments," assigns it **By Department** to the Logistics Department, sets Target Date to one week out, and marks priority **High**. Over the following days, whoever picks it up posts comments ("Confirmed 12 mislabeled parcels this week," "Root cause: printer template mismatch") and moves the story through **To Do → In Progress → Finished** via the Change Status overlay, leaving a permanent, timestamped record of the investigation — visible to management without a separate status-update meeting.

```
Story created (To Do, High priority)
        ↓
   In Progress (comment: root cause found)
        ↓
   Testing (comment: fix verified with 1 courier)
        ↓
   Finished (comment: rolled out to all couriers)
```

## 5.8 Decision Tree — Story Not Progressing

```
Story has sat in one stage past its Target Date?
        ↓
       YES
        ↓
Check Comments (4.4) — has anyone posted an update?
        ↓
   ┌────┴────┐
   NO         YES
   ↓           ↓
Follow up   Comments explain a blocker —
with the    escalate the blocker itself,
Assignee    not the story's ERP status
directly
```

## 5.9 Common Mistakes

⚠ **Confusing Priority with Stage.** Setting a story's priority to Critical does not move it between To Do/In Progress/Testing/Finished — only **Change Status** does that.
⚠ **Assigning "By Department" when a single named owner is needed.** Department assignment is best for shared/queue-style work; use **Custom** when one person must be accountable.
⚠ **Skipping the Comment field on status changes.** Since Comments are the board's audit trail, changing status without a comment loses the "why," even though the "what" (new stage) is still recorded.

## 5.10 Troubleshooting

| Problem | Possible Cause | Diagnosis | Resolution | Escalation |
|---|---|---|---|---|
| A renamed column doesn't appear on an older story's Change Status overlay | Browser cache / stale view | Reload the Kanban Board page | Refresh and re-open the story | System administrator if persistent |
| Story assigned "By Department" isn't visible to the expected staff | Department not yet configured, or user not a member of it | Check Finance > Settings > Department (Module 6) for the department's member list | Add the user to the department, or reassign the story as Custom | System administrator |
| Uploaded attachment doesn't appear on the story | File size/type not supported | Re-check the upload requirements | Retry with a supported file | System administrator |

## 5.11 Security

🔒 Per Module 9 (User Management), Board access is governed by distinct permission checkboxes for **Kanban Board** access, **Settings** (column renaming), and **View All** (seeing every story vs. only one's own/assigned stories) — administrators should grant "View All" and "Settings" only to leads/managers who need cross-team visibility or column-naming control.

## 5.12 Suggested Screenshots

📷 **Kanban Board main table with checkmark columns** — caption: "A story's current stage shown at a glance across To Do, In Progress, Testing, and Finished."
📷 **Add Story form** — caption: "Creating a new story: title, description, attachment, target date, and department/custom assignment."
📷 **Change Status overlay** — caption: "Moving a story between stages, with a required comment for the audit trail."
📷 **Kanban Board Settings screen** — caption: "Renaming the board's five columns to match your team's own vocabulary."

## 5.13 Administrator Notes

- Decide column names once, in consultation with the departments that will use the board most, before wide rollout.
- Periodically review stories with no Target Date or no recent Comments as a proxy for stalled work.

## 5.14 Manager Notes

- **KPIs:** stories overdue (past Target Date, not Finished), average time-in-stage, count of Critical-priority stories outstanding.
- Use **Assigned By** filtering to review what your own team has delegated versus what it's carrying itself.

## 5.15 Employee Notes

**Daily responsibilities:** check stories assigned to you; move them through Change Status with a comment as work progresses; flag blockers in Comments rather than leaving a story stalled silently.

**Do's:** ✅ Set a realistic Target Date at creation time.
**Don'ts:** ⚠ Don't leave a Finished story's status un-updated — downstream reports and managers rely on accurate stage data.

## 5.16 Templates

**Story Creation Checklist**
```
[ ] Title is specific and actionable
[ ] Description explains the "why," not just the "what"
[ ] Target Date set
[ ] Assigned To (Department or Custom) set
[ ] Priority set appropriately
```

---

*Next: Module 3 — E-commerce*
