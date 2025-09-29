import { query, getRequestEvent } from '$app/server';

export const callWorker = query(async () => {
	const { platform } = getRequestEvent();

	const result = await platform!.env.CF_WORKER.sayHelloFromWorker();
	return { message: result };
});

export const callDurableObject = query(async () => {
	const { platform } = getRequestEvent();

	const result = await platform!.env.CF_WORKER.sayHelloFromDO();
	return { message: result };
});
