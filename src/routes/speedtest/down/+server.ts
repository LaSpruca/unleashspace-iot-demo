import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const RUNTIME_SECONDS = parseInt(env.RUNTIME_SECONDS);
const INTERVAL_MILISECONDS = parseInt(env.INTERVAL_MILISECONDS);
const PAYLOAD_PADDING = parseInt(env.PAYLOAD_PADDING);

const MAX_ITERATIONS = (RUNTIME_SECONDS * 1000) / INTERVAL_MILISECONDS;

function generatePayloadPadding() {
	const arr = new Uint8Array(PAYLOAD_PADDING);
	arr.fill(69);
	return new TextDecoder().decode(arr);
}

export const GET: RequestHandler = async () => {
	console.log({ INTERVAL_MILISECONDS, RUNTIME_SECONDS });
	const payload = generatePayloadPadding();

	let interval: ReturnType<typeof setInterval>;
	let iterations = 0;
	let closed = false;

	const ac = new AbortController();
	ac.signal.addEventListener('abort', () => {
		clearInterval(interval);
		closed = true;
	});

	const stream = new ReadableStream({
		start(controller) {
			interval = setInterval(() => {
				if (closed) {
					return;
				}

				if (iterations > MAX_ITERATIONS) {
					controller.enqueue('done');
					ac.abort();
					return;
				}

				iterations++;

				try {
					controller.enqueue(`${payload}\n{ "time": ${Date.now()} }\n`);
				} catch (ex) {
					console.error('Could not enqueue message', ex);
				}
			}, INTERVAL_MILISECONDS);
		},

		cancel() {
			ac.abort();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream'
		}
	});
};
