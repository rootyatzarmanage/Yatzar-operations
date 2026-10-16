/**
 * Used by the Calendar page to open the real Add/Edit form of a page
 * (Task, Meetings, Calls, Contacts, Leads, Customers) inside a modal.
 * When `embed` is passed the page skips its list view / breadcrumb, opens
 * its own form straight away and calls `onClose` when the form is closed
 * (after save or cancel).
 */
export type EmbedConfig = { editId?: string; onClose: () => void };
export type EmbedProps = { embed?: EmbedConfig };
