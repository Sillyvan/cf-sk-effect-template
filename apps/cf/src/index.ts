import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';

export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async sayHelloFromDO(): Promise<string> {
		return 'Hello from Durable Object';
	}
}

export class CFWorker extends WorkerEntrypoint<Env> {
	async sayHelloFromWorker(): Promise<string> {
		return 'Hello from Worker';
	}

	async sayHelloFromDO() {
		const stub = this.env.MY_DURABLE_OBJECT.getByName('rpc-test');
		return stub.sayHelloFromDO();
	}
}

export default CFWorker;
