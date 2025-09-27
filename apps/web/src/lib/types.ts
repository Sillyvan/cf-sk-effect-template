export type LoadResult = {
	attempts: number;
	status: 'success' | 'failed';
	message: string;
	error?: string;
};
