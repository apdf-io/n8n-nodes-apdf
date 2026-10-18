import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeRequestOutput,
	type IPostReceiveRootProperty,
	type JsonObject,
} from 'n8n-workflow';

const PRICING_URL = 'https://apdf.io/pricing';

type ErrorDetails = { message: string; description?: string };

/**
 * Decide what an Apdf error response means, as a plain function of the response.
 *
 * Separate from the throwing so the mapping can be read — and tested — on its own.
 */
export function describeError(status: number, body: IDataObject): ErrorDetails {
	const upgradeUrl = String(body.upgrade_url ?? PRICING_URL);

	// Plan and quota refusals both arrive as 403 with an "error" discriminator.
	if (body.error === 'quota_exceeded') {
		return {
			message: `Plan limit reached for ${String(body.quota ?? 'this resource')}`,
			description: `You have used ${String(body.used)} of ${String(
				body.limit,
			)}. Upgrade at ${upgradeUrl}.`,
		};
	}

	if (body.error === 'feature_not_available') {
		return {
			message: `${String(body.feature ?? 'This feature')} is not available on your plan`,
			description: [String(body.message ?? ''), `Upgrade at ${upgradeUrl}.`]
				.filter((part) => part !== '')
				.join(' '),
		};
	}

	// Rejected requests name the offending fields, which is the useful part. Laravel validation
	// lists the messages of a field; errors raised while a PDF operation runs give a single string.
	if (status === 422 && body.errors !== undefined && body.errors !== null && typeof body.errors === 'object') {
		return {
			message: String(body.message ?? 'The request was rejected'),
			description: Object.entries(body.errors as Record<string, string | string[]>)
				.map(([field, messages]) => `${field}: ${([] as string[]).concat(messages).join(' ')}`)
				.join('; '),
		};
	}

	if (status === 401) {
		return {
			message: 'Apdf rejected the API token',
			description:
				'Check the token in your Apdf API credentials. Tokens are created in Dashboard → API → Tokens.',
		};
	}

	if (status === 404) {
		return {
			message: 'Apdf could not find that record',
			description: 'Check the ID. It must belong to the same workspace as the API token.',
		};
	}

	if (status === 429) {
		return {
			message: 'Too many requests to Apdf',
			description: "Slow the workflow down, or turn on 'Retry On Fail' in the node settings.",
		};
	}

	return { message: String(body.message ?? `Apdf returned status ${status}`) };
}

/**
 * Turn an Apdf error response into a message worth reading in the workflow log.
 *
 * Without this the raw JSON body surfaces, so a workflow that hits a plan limit fails with
 * `{"error":"quota_exceeded","quota":"pdf_operations_monthly",...}` instead of saying what
 * went wrong and what to do about it.
 */
async function handleApdfError(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const status = Number(response.statusCode);

	if (status < 400) {
		return data;
	}

	throw new NodeApiError(
		this.getNode(),
		response as unknown as JsonObject,
		describeError(status, (response.body ?? {}) as IDataObject),
	);
}

/**
 * Apdf wraps every resource response in a "data" property. n8n expects one item per record,
 * so each operation unwraps it before the items reach the workflow.
 */
const unwrapData: IPostReceiveRootProperty = {
	type: 'rootProperty',
	properties: {
		property: 'data',
	},
};

/** What a resource endpoint returns: readable errors, then the record without its envelope. */
export const resourceOutput: INodeRequestOutput = {
	postReceive: [handleApdfError, unwrapData],
};

/** What the PDF and job endpoints return: readable errors, payload as sent. */
export const rawOutput: INodeRequestOutput = {
	postReceive: [handleApdfError],
};

/**
 * Apdf answers a delete with an empty body, so the item says what happened instead, as n8n
 * nodes do for every delete.
 */
async function markDeleted(): Promise<INodeExecutionData[]> {
	return [{ json: { deleted: true } }];
}

/** What a delete returns: readable errors, then a single { deleted: true } item. */
export const deleteOutput: INodeRequestOutput = {
	postReceive: [handleApdfError, markDeleted],
};
