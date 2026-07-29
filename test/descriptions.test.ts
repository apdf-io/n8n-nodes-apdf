import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { ApdfApi } from '../credentials/ApdfApi.credentials';
import { Apdf } from '../nodes/Apdf/Apdf.node';
import { ApdfTrigger } from '../nodes/Apdf/ApdfTrigger.node';
import { triggerEvents } from '../nodes/shared/events';
import { describeError } from '../nodes/shared/output';

type OperationOption = INodePropertyOptions & {
	action?: string;
	routing?: { request?: { method?: string; url?: string }; output?: { postReceive?: unknown[] } };
};

const properties = new Apdf().description.properties;

/** One "operation" dropdown per resource. */
const operationProperties = properties.filter((property) => property.name === 'operation');

const resourceOf = (property: INodeProperties): string =>
	((property.displayOptions?.show?.resource ?? []) as string[])[0];

const operationsOf = (property: INodeProperties): OperationOption[] =>
	(property.options ?? []) as OperationOption[];

/** Resources whose responses are Laravel resources, so they must unwrap "data". */
const wrappedResources = ['analytics', 'automation', 'document', 'link'];

const declaredNames = new Set(properties.map((property) => property.name));

describe('Apdf node', () => {
	it('gives every operation an action, a description and a relative request', () => {
		for (const property of operationProperties) {
			for (const operation of operationsOf(property)) {
				const where = `${resourceOf(property)}.${String(operation.value)}`;

				expect(operation.action, `${where} needs an action`).toBeTruthy();
				expect(operation.description, `${where} needs a description`).toBeTruthy();
				expect(operation.routing?.request?.method, `${where} needs a method`).toBeTruthy();

				// URLs must stay relative so the credential's Base URL applies.
				expect(operation.routing?.request?.url, `${where} needs a URL`).toMatch(/^=?\//);
			}
		}
	});

	it('keeps operation values unique within each resource', () => {
		for (const property of operationProperties) {
			const values = operationsOf(property).map((operation) => operation.value);

			expect(new Set(values).size, `${resourceOf(property)} has a duplicate operation`).toBe(
				values.length,
			);
		}
	});

	it('only references parameters that exist', () => {
		for (const property of operationProperties) {
			for (const operation of operationsOf(property)) {
				const referenced = [...(operation.routing?.request?.url ?? '').matchAll(/\$parameter\.(\w+)/g)];

				for (const [, name] of referenced) {
					expect(declaredNames, `${String(operation.value)} references unknown ${name}`).toContain(
						name,
					);
				}
			}
		}
	});

	it('unwraps the data envelope on resource endpoints but not on PDF or job endpoints', () => {
		for (const property of operationProperties) {
			const resource = resourceOf(property);
			const shouldUnwrap = wrappedResources.includes(resource);

			for (const operation of operationsOf(property)) {
				const postReceive = (operation.routing?.output?.postReceive ?? []) as Array<
					{ type?: string } | unknown
				>;
				const unwraps = postReceive.some(
					(action) => (action as { type?: string })?.type === 'rootProperty',
				);
				const where = `${resource}.${String(operation.value)}`;

				// Delete returns an empty body, so there is nothing to unwrap.
				if (shouldUnwrap && operation.value !== 'delete') {
					expect(unwraps, `${where} should unwrap data`).toBe(true);
				}

				if (!shouldUnwrap) {
					expect(unwraps, `${where} must not unwrap`).toBe(false);
				}
			}
		}
	});

	it('turns API errors into readable messages on every operation', () => {
		for (const property of operationProperties) {
			for (const operation of operationsOf(property)) {
				const postReceive = (operation.routing?.output?.postReceive ?? []) as unknown[];
				const where = `${resourceOf(property)}.${String(operation.value)}`;

				expect(
					postReceive.some((action) => typeof action === 'function'),
					`${where} should handle API errors`,
				).toBe(true);
			}
		}
	});

	it('pairs every Limit with a Return All', () => {
		const returnAll = properties.filter((property) => property.name === 'returnAll');
		const limits = properties.filter((property) => property.name === 'limit');

		expect(limits.length).toBe(returnAll.length);
		expect(limits.length).toBeGreaterThan(0);

		for (const limit of limits) {
			expect(limit.displayOptions?.show?.returnAll).toEqual([false]);
		}
	});

	it('picks documents from a list rather than asking for an ID', () => {
		const pickers = properties.filter((property) => property.name === 'docId');

		expect(pickers.length).toBeGreaterThan(0);

		for (const picker of pickers) {
			expect(picker.type).toBe('options');
			expect(picker.typeOptions?.loadOptionsMethod).toBe('getDocuments');
		}

		expect(typeof new Apdf().methods?.loadOptions?.getDocuments).toBe('function');
	});
});

describe('Apdf Trigger node', () => {
	const trigger = new ApdfTrigger();

	it('implements the whole webhook lifecycle', () => {
		const hooks = trigger.webhookMethods?.default;

		expect(typeof hooks?.checkExists).toBe('function');
		expect(typeof hooks?.create).toBe('function');
		expect(typeof hooks?.delete).toBe('function');
	});

	it('requires credentials, because the hooks register the automation over the API', () => {
		expect(trigger.description.credentials?.[0]?.name).toBe('apdfApi');
		expect(trigger.description.credentials?.[0]?.required).toBe(true);
	});

	it('offers the same events as the automation resource', () => {
		const events = trigger.description.properties.find((property) => property.name === 'events');

		expect((events?.options ?? []).map((option) => (option as INodePropertyOptions).value)).toEqual(
			triggerEvents.map((event) => event.value),
		);
	});
});

describe('Apdf API credentials', () => {
	const credentials = new ApdfApi();

	it('sends the token as a bearer header', () => {
		expect(credentials.authenticate.properties.headers?.Authorization).toBe(
			'=Bearer {{$credentials.apiToken}}',
		);
	});
});

describe('error messages', () => {
	it('explains a quota refusal and where to upgrade', () => {
		const details = describeError(403, {
			error: 'quota_exceeded',
			quota: 'pdf_operations_monthly',
			used: 100,
			limit: 100,
			upgrade_url: 'https://apdf.io/pricing',
		});

		expect(details.message).toBe('Plan limit reached for pdf_operations_monthly');
		expect(details.description).toContain('100 of 100');
		expect(details.description).toContain('https://apdf.io/pricing');
	});

	it('names the fields a validation error rejected', () => {
		const details = describeError(422, {
			message: 'The given data was invalid.',
			errors: { pages: ['Invalid pages syntax'], file: ['The file must be a URL'] },
		});

		expect(details.description).toBe('pages: Invalid pages syntax; file: The file must be a URL');
	});

	it('falls back to the status when the body says nothing useful', () => {
		expect(describeError(500, {}).message).toBe('Apdf returned status 500');
	});
});
