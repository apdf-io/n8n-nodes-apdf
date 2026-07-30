import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Apdf } from '../nodes/Apdf/Apdf.node';
import { evaluateExpression, postReceiveFor, requestFor } from './harness';

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
	const pagination = () => {
		const { requestOperations } = requestFor(node, {
			resource: 'document',
			operation: 'getAll',
			returnAll: true,
		});

		return requestOperations?.pagination as {
			type: string;
			properties: { continue: string; request: { qs: IDataObject } };
		};
	};

	/** Evaluate a pagination expression against a stubbed response, using n8n's engine. */
	const evaluate = (expression: string, body: IDataObject): unknown =>
		evaluateExpression(expression, { $response: { body }, $request: { url: '/docs' } });

	it('keeps going while pages remain', () => {
		const { properties } = pagination();

		expect(evaluate(properties.continue, { meta: { current_page: 1, last_page: 3 } })).toBe(true);
		expect(evaluate(properties.continue, { meta: { current_page: 3, last_page: 3 } })).toBe(false);
		expect(evaluate(properties.continue, {})).toBe(false);
	});

	it('asks for the next page number, so the other filters survive', () => {
		const { properties } = pagination();

		expect(evaluate(properties.request.qs.page as string, { meta: { current_page: 1 } })).toBe(2);
		expect(evaluate(properties.request.qs.page as string, { meta: { current_page: 7 } })).toBe(8);
	});

	it('does not follow links.next, which drops the query string', () => {
		expect(JSON.stringify(pagination())).not.toContain('links');
	});
});
