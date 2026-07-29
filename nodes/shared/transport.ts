import {
	NodeApiError,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { APDF_CREDENTIALS } from '../../credentials/ApdfApi.credentials';

const DEFAULT_BASE_URL = 'https://apdf.io/api';

/** Contexts that can make an authenticated request outside declarative routing. */
type RequestContext = IHookFunctions | ILoadOptionsFunctions;

type RequestOptions = { body?: IDataObject; qs?: IDataObject };

/**
 * Resolve the API base URL from the credential, tolerating a trailing slash.
 */
async function resolveBaseUrl(context: RequestContext): Promise<string> {
	const credentials = await context.getCredentials(APDF_CREDENTIALS);

	return ((credentials.baseUrl as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/**
 * Send the request and let the raw error through, so each caller can decide what it means.
 */
async function send(
	context: RequestContext,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions,
): Promise<IDataObject> {
	return (await context.helpers.httpRequestWithAuthentication.call(context, APDF_CREDENTIALS, {
		method,
		url: `${await resolveBaseUrl(context)}${path}`,
		json: true,
		...options,
	})) as IDataObject;
}

/**
 * Call the Apdf API from a webhook hook or a load-options method.
 *
 * Declarative routing covers the node's operations; this is for the code paths that have to
 * talk to the API themselves.
 */
export async function apdfApiRequest(
	context: RequestContext,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<IDataObject> {
	try {
		return await send(context, method, path, options);
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject);
	}
}

/**
 * Same as apdfApiRequest, but a missing record yields null instead of an error.
 *
 * The webhook hooks need "gone" and "broken" to be different outcomes: an automation deleted
 * in Apdf should let the trigger recreate it, and deactivating a workflow whose automation is
 * already gone has nothing to complain about.
 */
export async function apdfApiRequestOrNull(
	context: RequestContext,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<IDataObject | null> {
	try {
		return await send(context, method, path, options);
	} catch (error) {
		if ((error as { httpCode?: string })?.httpCode === '404') {
			return null;
		}

		throw new NodeApiError(context.getNode(), error as JsonObject);
	}
}
