export type Item = {
	id: number;
	name: string;
	description?: string;
};

export type LoadResult = {
	items: Item[];
	hasMore: boolean;
	total: number;
	offset: number;
};

export type QueryResult = {
	attempts: number;
	status: 'success' | 'failed';
	message: string;
	error?: string;
};
