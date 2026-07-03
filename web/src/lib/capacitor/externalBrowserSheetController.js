/** @typedef {{ url: string, title?: string }} ExternalBrowserSheetRequest */

/** @type {((req: ExternalBrowserSheetRequest) => void) | null} */
let hostOpen = null;

/** @param {(req: ExternalBrowserSheetRequest) => void} handler */
export function registerExternalBrowserSheetHost(handler) {
  hostOpen = handler;
  return () => {
    if (hostOpen === handler) hostOpen = null;
  };
}

/** @param {ExternalBrowserSheetRequest} req */
export function openExternalBrowserSheetHost(req) {
  if (hostOpen) {
    hostOpen(req);
    return true;
  }
  return false;
}
