import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Apdf } from '../nodes/Apdf/Apdf.node';
import { requestFor } from './harness';

const node = new Apdf();

const build = (parameters: IDataObject) => requestFor(node, parameters);

describe('the request the node sends', () => {
	it('lists documents against the credential base URL', () => {
		const { options } = build({ resource: 'document', operation: 'getAll', status: 'all' });

		expect(options.method).toBe('GET');
		expect(options.baseURL).toBe('https://api.test/v1');
		expect(options.url).toBe('/docs');
		expect(options.qs).toMatchObject({ status: 'all' });
	});

	it('puts the document ID in the path, not the body', () => {
		const { options } = build({ resource: 'document', operation: 'archive', docId: 'abc-123' });

		expect(options.method).toBe('POST');
		expect(options.url).toBe('/docs/abc-123/archive');
		expect(options.body).toEqual({});
	});

	it('sends the create fields as a body', () => {
		const { options } = build({
			resource: 'document',
			operation: 'create',
			file: 'https://example.com/a.pdf',
			name: 'Proposal',
		});

		expect(options.url).toBe('/docs');
		expect(options.body).toMatchObject({ file: 'https://example.com/a.pdf', name: 'Proposal' });
	});

	it('sends the Office file and webhook URL for Convert From Office', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'convert',
			file: 'https://example.com/report.docx',
			options: { webhook_url: 'https://hooks.test/x' },
		});

		expect(options.url).toBe('/pdf/file/convert');
		expect(options.body).toEqual({
			file: 'https://example.com/report.docx',
			webhook_url: 'https://hooks.test/x',
		});
	});

	it('maps Limit onto per_page', () => {
		const { options } = build({
			resource: 'document',
			operation: 'getAll',
			returnAll: false,
			limit: 10,
		});

		expect(options.qs).toMatchObject({ per_page: 10 });
	});

	it('registers pagination only when Return All is on', () => {
		const withAll = build({ resource: 'document', operation: 'getAll', returnAll: true });
		const withLimit = build({ resource: 'document', operation: 'getAll', returnAll: false });

		expect(withAll.options.qs).not.toHaveProperty('per_page');
		expect(withAll.requestOperations?.pagination).toBeDefined();
		expect(withLimit.maxResults ?? undefined).toBeUndefined();
	});

	it('turns comma-separated document IDs into an array', () => {
		const { options } = build({
			resource: 'automation',
			operation: 'create',
			name: 'From n8n',
			events: ['page:read'],
			webhook_url: 'https://hooks.test/x',
			scope: 'specific',
			docIds: 'aaa-111, bbb-222 ,,ccc-333',
		});

		expect((options.body as IDataObject).doc_ids).toEqual(['aaa-111', 'bbb-222', 'ccc-333']);
		expect((options.body as IDataObject).scope).toBe('specific');
	});

	it('turns the condition collection into the API shape', () => {
		const { options } = build({
			resource: 'automation',
			operation: 'create',
			name: 'From n8n',
			events: ['page:read'],
			webhook_url: 'https://hooks.test/x',
			conditionsUi: {
				condition: [
					{ type: 'page_number', value: 5 },
					{ type: 'time_on_page', value: 30 },
				],
			},
		});

		expect((options.body as IDataObject).conditions).toEqual([
			{ type: 'page_number', value: 5 },
			{ type: 'time_on_page', value: 30 },
		]);
	});

	it('turns the header collection into an object keyed by header name', () => {
		const { options } = build({
			resource: 'automation',
			operation: 'create',
			name: 'From n8n',
			events: ['document:loaded'],
			webhook_url: 'https://hooks.test/x',
			webhookHeadersUi: {
				header: [{ name: 'X-Apdf-Secret', value: 'shhh' }],
			},
		});

		expect((options.body as IDataObject).webhook_headers).toEqual({ 'X-Apdf-Secret': 'shhh' });
	});

	it('builds the merge body from the file collection', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'merge',
			filesUi: {
				file: [
					{ file: 'https://example.com/1.pdf', pages: '1-2' },
					{ file: 'https://example.com/2.pdf', pages: '' },
				],
			},
		});

		expect(options.url).toBe('/pdf/file/merge');
		expect((options.body as IDataObject).files).toEqual([
			{ file: 'https://example.com/1.pdf', pages: '1-2' },
			{ file: 'https://example.com/2.pdf', pages: '' },
		]);
	});

	it('sends rotations as an array of angle and pages', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'rotate',
			file: 'https://example.com/a.pdf',
			rotationsUi: { rotation: [{ angle: '90', pages: '1' }] },
		});

		expect((options.body as IDataObject).rotations).toEqual([{ angle: '90', pages: '1' }]);
	});

	it('nests the session ID in the analytics path', () => {
		const { options } = build({
			resource: 'analytics',
			operation: 'getSession',
			docId: 'doc-1',
			sessionId: 'sess-9',
		});

		expect(options.url).toBe('/docs/doc-1/analytics/sessions/sess-9');
	});

	it('sends the job ID in the body, since status check is a POST', () => {
		const { options } = build({ resource: 'job', operation: 'checkStatus', id: 'job-7' });

		expect(options.method).toBe('POST');
		expect(options.url).toBe('/job/status/check');
		expect(options.body).toMatchObject({ id: 'job-7' });
	});
});
