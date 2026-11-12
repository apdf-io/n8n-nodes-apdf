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

	it('sends the form fields to fill as an array of name and value', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'fillForm',
			file: 'https://example.com/form.pdf',
			fieldsUi: {
				field: [
					{ name: 'full_name', value: 'Jane Doe' },
					{ name: 'newsletter', value: 'true' },
				],
			},
			options: { flatten: true },
		});

		expect(options.url).toBe('/pdf/form/fill');
		expect(options.body).toEqual({
			file: 'https://example.com/form.pdf',
			fields: [
				{ name: 'full_name', value: 'Jane Doe' },
				{ name: 'newsletter', value: 'true' },
			],
			flatten: true,
		});
	});

	it('sends the pages and resolution to visualize a form', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'visualizeForm',
			file: 'https://example.com/form.pdf',
			options: { pages: '1-2', dpi: 150 },
		});

		expect(options.url).toBe('/pdf/form/visualize');
		expect(options.body).toEqual({ file: 'https://example.com/form.pdf', pages: '1-2', dpi: 150 });
	});

	it('sends the invoice data as JSON with its profile to create an e-invoice', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'createEinvoice',
			file: 'https://example.com/invoice.pdf',
			invoice: '{"number": "RE-1", "lines": [{"name": "Consulting", "quantity": 8, "unit_price": 120, "vat_rate": 19}]}',
			level: 'XRECHNUNG',
			options: { webhook_url: 'https://example.com/hook' },
		});

		expect(options.url).toBe('/pdf/einvoice/create');
		expect(options.body).toEqual({
			file: 'https://example.com/invoice.pdf',
			invoice: { number: 'RE-1', lines: [{ name: 'Consulting', quantity: 8, unit_price: 120, vat_rate: 19 }] },
			level: 'XRECHNUNG',
			webhook_url: 'https://example.com/hook',
		});
	});

	it('sends a ready XML instead of the invoice data and profile', () => {
		const { options } = build({
			resource: 'pdf',
			operation: 'createEinvoice',
			file: 'https://example.com/invoice.pdf',
			invoiceSource: 'xml',
			xml: '<rsm:CrossIndustryInvoice/>',
		});

		expect(options.body).toEqual({ file: 'https://example.com/invoice.pdf', xml: '<rsm:CrossIndustryInvoice/>' });
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

	it('nests the annotation ID in the path and sends the comment as a body', () => {
		const { options } = build({
			resource: 'analytics',
			operation: 'addAnnotationComment',
			docId: 'doc-1',
			annotationId: 'annot-7',
			author: 'Sam Lee',
			text: 'Yes, from 25 seats.',
		});

		expect(options.method).toBe('POST');
		expect(options.url).toBe('/docs/doc-1/annotations/annot-7/comments');
		expect(options.body).toEqual({ author: 'Sam Lee', text: 'Yes, from 25 seats.' });
	});

	it('sends recipients, members and the company approval as the signers of a signature request', () => {
		const { options } = build({
			resource: 'signatureRequest',
			operation: 'create',
			docId: 'doc-1',
			signersUi: {
				signer: [
					{ role: 'Client', name: 'Jane Doe', email: 'jane@contoso.com', member: '', company: false },
					{ role: 'Agency', name: '', email: '', member: 'sam@acme.com', company: false },
					{ role: 'Approval', name: '', email: '', member: '', company: true },
				],
			},
			sendEmail: false,
			options: { message: 'Here is the contract.', metadata: '{"deal_id":"D-42"}' },
		});

		expect(options.method).toBe('POST');
		expect(options.url).toBe('/docs/doc-1/signature-request');
		expect(options.body).toEqual({
			signers: [
				{ role: 'Client', name: 'Jane Doe', email: 'jane@contoso.com' },
				{ role: 'Agency', member: 'sam@acme.com' },
				{ role: 'Approval', company: true },
			],
			send_email: false,
			message: 'Here is the contract.',
			metadata: { deal_id: 'D-42' },
		});
	});

	it('places each signature field at an anchor, a signature box or coordinates', () => {
		const { options } = build({
			resource: 'signatureRequest',
			operation: 'create',
			docId: 'doc-1',
			signersUi: { signer: [{ role: 'Client', name: 'Jane Doe', email: 'jane@contoso.com' }] },
			signatureFieldsUi: {
				field: [
					{ role: 'Client', type: 'signature', anchor: '[client_signature]', pdf_field: '', page: 0, x: 0, y: 0 },
					{ role: 'Client', type: 'initials', anchor: '', pdf_field: 'Initials1', page: 0, x: 0, y: 0 },
					{ role: 'Client', type: 'date', anchor: '', pdf_field: '', page: 3, x: 72, y: 700 },
				],
			},
			sendEmail: true,
		});

		expect((options.body as { fields: unknown }).fields).toEqual([
			{ role: 'Client', type: 'signature', anchor: '[client_signature]' },
			{ role: 'Client', type: 'initials', pdf_field: 'Initials1' },
			{ role: 'Client', type: 'date', page: 3, x: 72, y: 700 },
		]);
	});

	it('gets and cancels the signature request of a document', () => {
		const get = build({ resource: 'signatureRequest', operation: 'get', docId: 'doc-1' });
		const cancel = build({ resource: 'signatureRequest', operation: 'cancel', docId: 'doc-1' });

		expect([get.options.method, get.options.url]).toEqual(['GET', '/docs/doc-1/signature-request']);
		expect([cancel.options.method, cancel.options.url]).toEqual(['POST', '/docs/doc-1/signature-request/cancel']);
	});

	it('sends the job ID in the body, since status check is a POST', () => {
		const { options } = build({ resource: 'job', operation: 'checkStatus', id: 'job-7' });

		expect(options.method).toBe('POST');
		expect(options.url).toBe('/job/status/check');
		expect(options.body).toMatchObject({ id: 'job-7' });
	});
});
