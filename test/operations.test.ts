import type { IDataObject } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Apdf } from '../nodes/Apdf/Apdf.node';
import { requestFor } from './harness';

const node = new Apdf();

/**
 * Every operation the node offers, with the minimum parameters it needs and the request it
 * should produce. The completeness test below fails if an operation is missing from here, so
 * adding one to the node forces a case for it.
 */
const cases: Array<{
	resource: string;
	operation: string;
	parameters?: IDataObject;
	method: string;
	url: string;
}> = [
	// Document
	{ resource: 'document', operation: 'getAll', method: 'GET', url: '/docs' },
	{ resource: 'document', operation: 'get', parameters: { docId: 'D1' }, method: 'GET', url: '/docs/D1' },
	{
		resource: 'document',
		operation: 'create',
		parameters: { file: 'https://e.test/a.pdf', name: 'A' },
		method: 'POST',
		url: '/docs',
	},
	{ resource: 'document', operation: 'delete', parameters: { docId: 'D1' }, method: 'DELETE', url: '/docs/D1' },
	{ resource: 'document', operation: 'archive', parameters: { docId: 'D1' }, method: 'POST', url: '/docs/D1/archive' },
	{ resource: 'document', operation: 'unarchive', parameters: { docId: 'D1' }, method: 'POST', url: '/docs/D1/unarchive' },
	{ resource: 'document', operation: 'makePublic', parameters: { docId: 'D1' }, method: 'POST', url: '/docs/D1/public' },
	{ resource: 'document', operation: 'makePrivate', parameters: { docId: 'D1' }, method: 'POST', url: '/docs/D1/private' },

	// Tracking link
	{
		resource: 'link',
		operation: 'create',
		parameters: { docId: 'D1', name: 'Jane' },
		method: 'POST',
		url: '/docs/D1/links',
	},
	{ resource: 'link', operation: 'getAll', parameters: { docId: 'D1' }, method: 'GET', url: '/docs/D1/links' },
	{
		resource: 'link',
		operation: 'delete',
		parameters: { docId: 'D1', token: 'T9' },
		method: 'DELETE',
		url: '/docs/D1/links/T9',
	},
	{
		resource: 'link',
		operation: 'activate',
		parameters: { docId: 'D1', token: 'T9' },
		method: 'POST',
		url: '/docs/D1/links/T9/activate',
	},
	{
		resource: 'link',
		operation: 'deactivate',
		parameters: { docId: 'D1', token: 'T9' },
		method: 'POST',
		url: '/docs/D1/links/T9/deactivate',
	},

	// Analytics
	{ resource: 'analytics', operation: 'get', parameters: { docId: 'D1' }, method: 'GET', url: '/docs/D1/analytics' },
	{
		resource: 'analytics',
		operation: 'getSessions',
		parameters: { docId: 'D1' },
		method: 'GET',
		url: '/docs/D1/analytics/sessions',
	},
	{
		resource: 'analytics',
		operation: 'getSession',
		parameters: { docId: 'D1', sessionId: 'S5' },
		method: 'GET',
		url: '/docs/D1/analytics/sessions/S5',
	},
	{
		resource: 'analytics',
		operation: 'getAnnotations',
		parameters: { docId: 'D1' },
		method: 'GET',
		url: '/docs/D1/annotations',
	},
	{
		resource: 'analytics',
		operation: 'getFormSubmissions',
		parameters: { docId: 'D1' },
		method: 'GET',
		url: '/docs/D1/form-submissions',
	},

	// Automation
	{ resource: 'automation', operation: 'getAll', method: 'GET', url: '/automations' },
	{ resource: 'automation', operation: 'getExecutions', method: 'GET', url: '/automations/executions' },
	{ resource: 'automation', operation: 'get', parameters: { automationId: 'A1' }, method: 'GET', url: '/automations/A1' },
	{
		resource: 'automation',
		operation: 'create',
		parameters: { name: 'N', events: ['page:read'], webhook_url: 'https://h.test/x' },
		method: 'POST',
		url: '/automations',
	},
	{ resource: 'automation', operation: 'delete', parameters: { automationId: 'A1' }, method: 'DELETE', url: '/automations/A1' },
	{ resource: 'automation', operation: 'activate', parameters: { automationId: 'A1' }, method: 'POST', url: '/automations/A1/activate' },
	{ resource: 'automation', operation: 'deactivate', parameters: { automationId: 'A1' }, method: 'POST', url: '/automations/A1/deactivate' },
	{ resource: 'automation', operation: 'duplicate', parameters: { automationId: 'A1' }, method: 'POST', url: '/automations/A1/duplicate' },

	// Job
	{ resource: 'job', operation: 'checkStatus', parameters: { id: 'J1' }, method: 'POST', url: '/job/status/check' },

	// PDF — file
	{ resource: 'pdf', operation: 'create', parameters: { html: '<p>Hi</p>' }, method: 'POST', url: '/pdf/file/create' },
	{
		resource: 'pdf',
		operation: 'split',
		parameters: { file: 'https://e.test/a.pdf', pages: '1,2' },
		method: 'POST',
		url: '/pdf/file/split',
	},
	{
		resource: 'pdf',
		operation: 'merge',
		parameters: { filesUi: { file: [{ file: 'https://e.test/a.pdf', pages: '' }] } },
		method: 'POST',
		url: '/pdf/file/merge',
	},
	{ resource: 'pdf', operation: 'compress', parameters: { file: 'https://e.test/a.pdf' }, method: 'POST', url: '/pdf/file/compress' },
	{
		resource: 'pdf',
		operation: 'toImage',
		parameters: { file: 'https://e.test/a.pdf', image_type: 'png' },
		method: 'POST',
		url: '/pdf/file/to-image',
	},

	// PDF — pages
	{
		resource: 'pdf',
		operation: 'extractPages',
		parameters: { file: 'https://e.test/a.pdf', pages: '1-2' },
		method: 'POST',
		url: '/pdf/page/extract',
	},
	{
		resource: 'pdf',
		operation: 'deletePages',
		parameters: { file: 'https://e.test/a.pdf', pages: '3' },
		method: 'POST',
		url: '/pdf/page/delete',
	},
	{
		resource: 'pdf',
		operation: 'rotate',
		parameters: { file: 'https://e.test/a.pdf', rotationsUi: { rotation: [{ angle: '90', pages: '' }] } },
		method: 'POST',
		url: '/pdf/page/rotate',
	},
	{
		resource: 'pdf',
		operation: 'overlay',
		parameters: { file: 'https://e.test/a.pdf', overlay: 'https://e.test/o.pdf' },
		method: 'POST',
		url: '/pdf/page/overlay',
	},
	{
		resource: 'pdf',
		operation: 'underlay',
		parameters: { file: 'https://e.test/a.pdf', underlay: 'https://e.test/u.pdf' },
		method: 'POST',
		url: '/pdf/page/underlay',
	},

	// PDF — content and OCR
	{
		resource: 'pdf',
		operation: 'search',
		parameters: { file: 'https://e.test/a.pdf', text: 'invoice' },
		method: 'POST',
		url: '/pdf/content/search',
	},
	{ resource: 'pdf', operation: 'read', parameters: { file: 'https://e.test/a.pdf' }, method: 'POST', url: '/pdf/content/read' },
	{ resource: 'pdf', operation: 'ocrConvert', parameters: { file: 'https://e.test/a.pdf' }, method: 'POST', url: '/pdf/ocr/convert' },
	{
		resource: 'pdf',
		operation: 'ocrSearch',
		parameters: { file: 'https://e.test/a.pdf', text: 'invoice' },
		method: 'POST',
		url: '/pdf/ocr/search',
	},
	{ resource: 'pdf', operation: 'ocrRead', parameters: { file: 'https://e.test/a.pdf' }, method: 'POST', url: '/pdf/ocr/read' },

	// PDF — security and metadata
	{
		resource: 'pdf',
		operation: 'addSecurity',
		parameters: { file: 'https://e.test/a.pdf', owner_password: 'pw' },
		method: 'POST',
		url: '/pdf/security/add',
	},
	{ resource: 'pdf', operation: 'removeSecurity', parameters: { file: 'https://e.test/a.pdf' }, method: 'POST', url: '/pdf/security/remove' },
	{ resource: 'pdf', operation: 'readMetadata', parameters: { file: 'https://e.test/a.pdf' }, method: 'POST', url: '/pdf/metadata/read' },
];

describe('every operation builds the right request', () => {
	it.each(cases)('$resource.$operation -> $method $url', ({ resource, operation, parameters, method, url }) => {
		const { options } = requestFor(node, { resource, operation, ...parameters });

		expect(options.method).toBe(method);
		expect(options.url).toBe(url);
		expect(options.baseURL).toBe('https://api.test/v1');
	});

	it('covers every operation the node declares', () => {
		const covered = new Set(cases.map((c) => `${c.resource}.${c.operation}`));
		const declared = node.description.properties
			.filter((property) => property.name === 'operation')
			.flatMap((property) => {
				const resource = (property.displayOptions?.show?.resource ?? [])[0] as string;

				return (property.options ?? [])
					.map((option) => (option as { value: string }).value)
					// n8n injects this option itself; it has no routing of ours to check.
					.filter((value) => value !== '__CUSTOM_API_CALL__')
					.map((value) => `${resource}.${value}`);
			});

		expect(declared.filter((name) => !covered.has(name))).toEqual([]);
		expect(declared.length).toBe(cases.length);
	});
});
