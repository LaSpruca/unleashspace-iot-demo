import { THINGSPEAK_KEY } from '$env/static/private';

export interface SubmitRequest {
	lat: number;
	long: number;
	alt: number;
	averageDownload: number;
	date: Date;
}

export async function uploadResults(
	averageSpeed: number,
	time: Date,
	lat: number,
	long: number,
	alt: number,
	fetchFn: typeof fetch = fetch
) {
	const result = await fetchFn('https://api.thingspeak.com/update.json', {
		method: 'POST',
		body: JSON.stringify({
			api_key: THINGSPEAK_KEY,
			field1: averageSpeed,
			lat,
			long,
			elevation: alt,
			created_at: time.toISOString()
		}),
		headers: { 'Content-Type': 'application/json' }
	});

	if (!result.ok) {
		console.error('Could not submit result', await result.json());
	}
}
