import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Apdf } from '../nodes/Apdf/Apdf.node';
import { fetchAllPages } from '../nodes/shared/pagination';
import { postReceiveFor, requestFor } from './harness';

const node = new Apdf();

const listBody = {
	data: [
		{ doc_id: 'aaa-111', name: 'One' },
		{ doc_id: 'bbb-222', name: 'Two' },
	],
	links: { first: 'x?page=1', last: 'x?page=1', prev: null, next: null },
	meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 },
};

describe('what the workflow receives', () => {
	it('emits one item per record instead of the whole envelope', async () => {
		const items = await postReceiveFor(
			node,
			{ resource: 'document', operation: 'getAll' },
			{ statusCode: 200, body: listBody },
		);

		expect(items).toEqual([
			{ doc_id: 'aaa-111', name: 'One' },
			{ doc_id: 'bbb-222', name: 'Two' },
		]);
	});

	it('unwraps a single record too', async () => {
		const items = await postReceiveFor(
			node,
			{ resource: 'document', operation: 'get', docId: 'aaa-111' },
			{ statusCode: 200, body: { data: { doc_id: 'aaa-111', name: 'One' } } },
		);

		expect(items).toEqual([{ doc_id: 'aaa-111', name: 'One' }]);
	});

	it('leaves PDF payloads alone, because they have no envelope', async () => {
		const body = { file: 'https://files.test/a.pdf', pages: 12, size: 165310 };
		const items = await postReceiveFor(
			node,
			{ resource: 'pdf', operation: 'merge', filesUi: { file: [{ file: 'https://a/1.pdf' }] } },
			{ statusCode: 200, body },
		);

		expect(items).toEqual([body]);
	});

	it('explains a plan limit rather than leaking the raw body', async () => {
		await expect(
			postReceiveFor(
				node,
				{ resource: 'pdf', operation: 'merge', filesUi: { file: [{ file: 'https://a/1.pdf' }] } },
				{
					statusCode: 403,
					body: {
						error: 'quota_exceeded',
						quota: 'pdf_operations_monthly',
						used: 100,
						limit: 100,
						upgrade_url: 'https://apdf.io/pricing',
					},
				},
			),
		).rejects.toThrow(/Plan limit reached for pdf_operations_monthly/);
	});

	it('names the rejected fields on a validation error', async () => {
		await expect(
			postReceiveFor(
				node,
				{ resource: 'document', operation: 'create', file: 'not-a-url', name: 'x' },
				{
					statusCode: 422,
					body: { message: 'The given data was invalid.', errors: { file: ['Must be a URL'] } },
				},
			),
		).rejects.toThrow(/The given data was invalid/);
	});

	it('says the token was rejected on a 401', async () => {
		await expect(
			postReceiveFor(
				node,
				{ resource: 'document', operation: 'getAll' },
				{ statusCode: 401, body: { message: 'Unauthenticated.' } },
			),
		).rejects.toThrow(/rejected the API token/);
	});
});

describe('Return All pagination', () => {
	/** Run the paging function against stubbed pages of the given sizes. */
	const paginate = async (pageSizes: number[], qs: IDataObject = {}) => {
		const requests: IDataObject[] = [];
		const makeRoutingRequest = async (requestData: DeclarativeRestApiSettings.ResultOptions) => {
			requests.push(requestData.options.qs as IDataObject);
			const size = pageSizes[requests.length - 1] ?? 0;

			return Array.from({ length: size }, (_, index) => ({ json: { index } }));
		};
		const requestData = {
			options: { url: '/docs', qs },
			preSend: [],
			postReceive: [],
			requestOperations: {},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const items = await fetchAllPages.call(
			{ makeRoutingRequest } as unknown as IExecutePaginationFunctions,
			requestData,
		);

		return { items, requests };
	};

	it('starts at page 1 and stops at the first short page', async () => {
		const { items, requests } = await paginate([100, 100, 37]);

		expect(items).toHaveLength(237);
		expect(requests.map((qs) => qs.page)).toEqual([1, 2, 3]);
	});

	it('makes a single request when everything fits on one page', async () => {
		const { items, requests } = await paginate([3]);

		expect(items).toHaveLength(3);
		expect(requests).toEqual([{ page: 1, per_page: 100 }]);
	});

	it('keeps the original filters on every page', async () => {
		const { requests } = await paginate([100, 5], { status: 'archived' });

		expect(requests).toEqual([
			{ status: 'archived', page: 1, per_page: 100 },
			{ status: 'archived', page: 2, per_page: 100 },
		]);
	});

	it('is what Return All pages with', () => {
		const { requestOperations } = requestFor(node, {
			resource: 'document',
			operation: 'getAll',
			returnAll: true,
		});

		expect(requestOperations?.pagination).toBe(fetchAllPages);
	});
});
