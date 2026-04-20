import './style.css';

export default defineContentScript({
  matches: ['*://www.examtopics.com/*'],
  runAt: 'document_start',

  main(ctx) {
    const TARGET_ID = 'notRemoverPopup';

    /**
     * Removes the element from the DOM.
     * Wrapped in try-catch so that race conditions where another script has
     * already removed the element do not propagate an error to the host page.
     */
    function safeRemove(el: Element): void {
      try {
        el.remove();
      } catch {
        // Element was already removed — nothing to do.
      }
    }

    /**
     * Restores body scroll if the page locked it when showing the popup.
     * Uses optional chaining so this is safe to call before <body> exists.
     */
    function restoreBodyScroll(): void {
      if (document.body?.style.overflow === 'hidden') {
        document.body.style.overflow = 'auto';
      }
    }

    /**
     * Checks a newly added DOM node (and its subtree) for the target popup.
     * Returns true if the popup was found and removed.
     *
     * Scanning added nodes directly — rather than calling getElementById on
     * every mutation — avoids a full-document query on each DOM change and
     * keeps CPU overhead minimal.
     */
    function handleAddedNode(node: Node): boolean {
      if (!(node instanceof Element)) return false;

      if (node.id === TARGET_ID) {
        safeRemove(node);
        restoreBodyScroll();
        console.log('[EXO] Popup removed successfully.');
        return true;
      }

      // The popup may be nested inside a freshly added wrapper element.
      const nested = node.querySelector(`#${TARGET_ID}`);
      if (nested) {
        safeRemove(nested);
        restoreBodyScroll();
        console.log('[EXO] Popup removed successfully.');
        return true;
      }

      return false;
    }

    // Phase 2: Active MutationObserver monitoring.
    // Observes the entire document subtree for newly added nodes.
    // Runs continuously — never disconnects — to handle re-appearing popups.
    const observer = new MutationObserver((mutations) => {
      // Stop processing if the extension context has been invalidated
      // (e.g. the extension was updated or unloaded).
      if (ctx.isInvalid) {
        observer.disconnect();
        return;
      }

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (handleAddedNode(node)) return;
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Initial check: the popup may already be in the DOM when this script runs.
    const existing = document.getElementById(TARGET_ID);
    if (existing) {
      safeRemove(existing);
      restoreBodyScroll();
      console.log('[EXO] Popup removed successfully (initial check).');
    }
  },
});
