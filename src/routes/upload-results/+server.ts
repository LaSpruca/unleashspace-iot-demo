import { uploadResults, type SubmitRequest } from '$lib/upload';
import { error, text, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ fetch, request }) => {
	try {
		const body = (await request.json()) as SubmitRequest;
		body['date'] = new Date(body['date']);
		await uploadResults(body.averageDownload, body.date, body.lat, body.long, body.alt, fetch);
	} catch (ex) {
		console.error(ex);
		return error(500);
	}

	return text('');
};
