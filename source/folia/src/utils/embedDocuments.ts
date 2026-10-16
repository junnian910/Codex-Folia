// src/utils/embedDocuments.ts
// DOM events do not cross document boundaries; embedded menus need their visible documents.
export function getInteractionDocuments(owner?: Document | null): Document[] {
    const docs = new Set<Document>([document]);
    if (owner) docs.add(owner);
    if (window.name === 'folia-codex-runtime') {
        docs.add(parent.document);
        for (const frame of parent.document.querySelectorAll<HTMLIFrameElement>('iframe[id^="folia-"]')) {
            if (frame.contentDocument) docs.add(frame.contentDocument);
        }
    }
    return [...docs];
}
