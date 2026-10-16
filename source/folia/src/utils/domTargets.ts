// src/utils/domTargets.ts
// React portals may render into another document; instanceof fails across iframe realms.
export const isElementTarget = (target: EventTarget | null): target is Element =>
    (target as Node | null)?.nodeType === 1;

export const isHtmlElementTarget = (target: EventTarget | null): target is HTMLElement =>
    isElementTarget(target) && target.namespaceURI === 'http://www.w3.org/1999/xhtml';

export const isNodeTarget = (target: EventTarget | null): target is Node =>
    typeof (target as Node | null)?.nodeType === 'number';
