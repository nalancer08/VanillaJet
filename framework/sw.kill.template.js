/**
 * VanillaJet kill-switch service worker.
 *
 * Published at /sw.js when `enable_service_worker` is OFF. A client still
 * running a previously installed worker byte-diffs /sw.js on its next update
 * check, installs this one and self-destructs: every Cache Storage entry on
 * the origin is deleted, the registration is unregistered and every window
 * the old worker was controlling reloads once, so no page keeps painting
 * from a frozen cache.
 *
 * A 404 at /sw.js cannot do this reliably: browsers only unregister on a
 * full navigation's update check, the already-broken session stays broken
 * until a second manual reload, and page-side teardown code never reaches
 * clients whose stale bundle is itself served by the old worker's cache.
 */

globalThis.addEventListener('install', () => {
	globalThis.skipWaiting();
});

globalThis.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.map((key) => caches.delete(key)));
		await globalThis.registration.unregister();
		// Only windows this worker CONTROLS are returned (no clients.claim()
		// on purpose). Clients inherited from a previous worker via
		// skipWaiting() reload once, clean; a page that registered the
		// kill-switch itself while uncontrolled is left alone, so a
		// misconfigured consumer that keeps registering /sw.js can never
		// enter a reload loop.
		const windows = await globalThis.clients.matchAll({ type: 'window' });
		await Promise.allSettled(windows.map((client) => client.navigate(client.url)));
	})());
});

// No fetch handler on purpose: while the kill-switch is (briefly) in
// control, every request goes straight to the network.
