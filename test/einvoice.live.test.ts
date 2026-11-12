import { sleep, type IDataObject } from 'n8n-workflow';
import { beforeAll, describe, expect, it } from 'vitest';
import { Apdf } from '../nodes/Apdf/Apdf.node';
import { requestFor } from './harness';

/*
 * These tests send the requests the node builds to a running Apdf, such as a local one, and
 * check what comes back. They run only when APDF_BASE_URL and APDF_TEST_TOKEN are set.
 */
const baseUrl = import.meta.env.APDF_BASE_URL as string | undefined;
const token = import.meta.env.APDF_TEST_TOKEN as string | undefined;

const node = new Apdf();

/** The invoice PDF the e-invoices are made from, generated through the node like in a workflow. */
let invoicePdf: unknown;

/**
 * Send the request the node builds for the given parameters, and return the response body.
 */
const send = async (parameters: IDataObject): Promise<IDataObject> => {
	const { options } = requestFor(node, parameters, { apiToken: token, baseUrl });
	const response = await fetch(`${options.baseURL}${options.url}`, {
		method: options.method,
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify(options.body),
	});

	return (await response.json()) as IDataObject;
};

/**
 * Wait for a job the way a workflow would with 'Job → Check Status'.
 */
const finished = async (jobId: unknown): Promise<IDataObject> => {
	for (let attempt = 0; attempt < 60; attempt++) {
		const job = await send({ resource: 'job', operation: 'checkStatus', id: jobId });

		if (job.status === 'successful' || job.status === 'failed') {
			return job;
		}

		await sleep(1000);
	}

	throw new Error(`Job ${String(jobId)} did not finish in time`);
};

const invoice = {
	number: 'RE-2026-0042',
	issue_date: '2026-11-11',
	due_date: '2026-11-25',
	currency: 'EUR',
	seller: {
		name: 'Lieferant GmbH',
		vat_id: 'DE123456789',
		address: { line1: 'Lieferantenstraße 20', city: 'München', postcode: '80333', country: 'DE' },
	},
	buyer: { name: 'Kunden AG', address: { line1: 'Kundenstraße 15', city: 'Frankfurt', postcode: '60311', country: 'DE' } },
	payment: { iban: 'DE02120300000000202051', terms: 'Payable within 14 days' },
	lines: [{ name: 'Consulting', quantity: 8, unit: 'HUR', unit_price: 120, vat_rate: 19 }],
	charges: [{ amount: 4.95, reason: 'Shipping', vat_rate: 19 }],
};

describe.skipIf(!baseUrl || !token)('e-invoices against a running Apdf', { timeout: 120_000 }, () => {
	beforeAll(async () => {
		const html = '<h1>Invoice RE-2026-0042</h1><p>Consulting, 8 hours at 120.00 EUR</p>';

		invoicePdf = ((await finished((await send({ resource: 'pdf', operation: 'create', html })).job_id)).result as IDataObject).file;
	});

	it('creates an e-invoice from the invoice data, reads it back and finds it valid', async () => {
		const created = await finished(
			(await send({ resource: 'pdf', operation: 'createEinvoice', file: invoicePdf, invoice: JSON.stringify(invoice) })).job_id,
		);

		expect(created).toMatchObject({ status: 'successful', result: { level: 'EN 16931' } });

		const file = (created.result as IDataObject).file;
		const read = await send({ resource: 'pdf', operation: 'readEinvoice', file });

		expect(read).toMatchObject({
			level: 'EN 16931',
			invoice: {
				number: 'RE-2026-0042',
				seller: { name: 'Lieferant GmbH' },
				charges: [{ amount: 4.95, reason: 'Shipping' }],
				totals: { net_total: 964.95, vat_total: 183.34, gross_total: 1148.29 },
			},
		});

		const validated = await finished((await send({ resource: 'pdf', operation: 'validateEinvoice', file })).job_id);

		expect(validated).toMatchObject({ status: 'successful', result: { valid: true, level: 'EN 16931', errors: [] } });
	});

	it('creates an e-invoice from a ready XML', async () => {
		const source = await finished(
			(await send({ resource: 'pdf', operation: 'createEinvoice', file: invoicePdf, invoice: JSON.stringify(invoice) })).job_id,
		);
		const xml = (await send({ resource: 'pdf', operation: 'readEinvoice', file: (source.result as IDataObject).file })).xml;

		const created = await finished(
			(await send({ resource: 'pdf', operation: 'createEinvoice', file: invoicePdf, invoiceSource: 'xml', xml })).job_id,
		);

		expect(created).toMatchObject({ status: 'successful', result: { level: 'EN 16931' } });
	});

	it('fails the job with the rules an invoice breaks', async () => {
		const failed = await finished(
			(await send({ resource: 'pdf', operation: 'createEinvoice', file: invoicePdf, invoice: JSON.stringify(invoice), level: 'XRECHNUNG' })).job_id,
		);

		expect(failed).toMatchObject({ status: 'failed', result: { message: 'The e-invoice is not valid.' } });
		expect(JSON.stringify(failed.result)).toContain('BR-DE-15');
	});
});
