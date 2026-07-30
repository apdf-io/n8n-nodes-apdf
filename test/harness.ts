import { RoutingNode } from 'n8n-core';
import {
	NodeHelpers,
	Workflow,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type INode,
	type INodeProperties,
	type INodeType,
	type INodeTypes,
	type IRunExecutionData,
	type IVersionedNodeType,
} from 'n8n-workflow';

/**
 * A minimal stand-in for n8n's own node test harness, which is not published to npm.
 *
 * It drives the real routing engine from n8n-core against our real node description, so a
 * test sees the request n8n would actually send — URL, query string, body, headers — instead
 * of only what the description looks like.
 */

const NODE_NAME = 'Apdf';
const NODE_TYPE = 'apdf-test.node';

/** RoutingNode declares these as private; the harness needs them to replay runNode's merge. */
type RoutingInternals = {
	mergeOptions: (
		destination: DeclarativeRestApiSettings.ResultOptions,
		source?: DeclarativeRestApiSettings.ResultOptions,
	) => void;
	getRequestOptionsFromParameters: (
		single: unknown,
		property: INodeProperties | { name?: string },
		itemIndex: number,
		runIndex: number,
		path: string,
		additionalKeys?: IDataObject,
	) => DeclarativeRestApiSettings.ResultOptions | undefined;
};

const DEFAULT_CREDENTIALS = { apiToken: 'test-token', baseUrl: 'https://api.test/v1' };

/**
 * Build the HTTP request the node would send for the given parameters.
 *
 * Mirrors what RoutingNode.runNode does per item: seed from requestDefaults, then merge the
 * contribution of every property, including the routing on the selected operation.
 */
export function requestFor(
	nodeType: INodeType,
	parameters: IDataObject,
	credentials: IDataObject = DEFAULT_CREDENTIALS,
): DeclarativeRestApiSettings.ResultOptions {
	const node: INode = {
		id: 'test-node',
		name: NODE_NAME,
		type: NODE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};

	const nodeTypes: INodeTypes = {
		getByName: () => nodeType as INodeType | IVersionedNodeType,
		getByNameAndVersion: () => nodeType,
		getKnownTypes: () => ({ [NODE_TYPE]: {} }),
	};

	const workflow = new Workflow({
		id: 'test',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});

	const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
	const connectionInputData = [{ json: {} }];

	const resolved = (NodeHelpers.getNodeParameters(
		nodeType.description.properties,
		parameters,
		true,
		false,
		node,
		nodeType.description,
	) ?? {}) as IDataObject;

	const evaluate = (value: unknown, additionalKeys: IDataObject = {}): unknown =>
		typeof value === 'string' && value.startsWith('=')
			? workflow.expression.getParameterValue(
					value,
					runExecutionData,
					0,
					0,
					NODE_NAME,
					connectionInputData,
					'manual',
					additionalKeys,
					undefined,
					false,
				)
			: value;

	const getNodeParameter = (name: string, _itemIndex?: number, fallback?: unknown) => {
		const value = resolved[name] === undefined ? fallback : resolved[name];

		return evaluate(value);
	};

	const executeData = { node, data: {}, source: null };

	const context = {
		node,
		nodeType,
		workflow,
		mode: 'manual',
		runIndex: 0,
		itemIndex: 0,
		connectionInputData,
		runExecutionData,
		additionalData: {},
		executeData,
		inputData: { main: [connectionInputData] },
		getNodeParameter,
		getCredentials: async () => credentials,
		getExecutionCancelSignal: () => undefined,
	};

	const single = {
		getNodeParameter,
		getExecuteData: () => executeData,
		getNode: () => node,
		helpers: {},
	};

	const routing = new RoutingNode(
		context as never,
		nodeType,
	) as unknown as RoutingInternals;

	const request: DeclarativeRestApiSettings.ResultOptions = {
		options: { qs: {}, body: {}, headers: {} },
		preSend: [],
		postReceive: [],
		requestOperations: {},
	};

	// requestDefaults seeds the request, with $credentials available to its expressions.
	const defaults = (nodeType.description.requestDefaults ?? {}) as IDataObject;

	for (const [key, value] of Object.entries(defaults)) {
		(request.options as IDataObject)[key] = evaluate(value, {
			$credentials: credentials,
		}) as never;
	}

	for (const property of nodeType.description.properties) {
		const contribution = routing.getRequestOptionsFromParameters(single, property, 0, 0, '', {
			$credentials: credentials,
			$value: resolved[property.name],
			$version: node.typeVersion,
		});

		routing.mergeOptions(request, contribution);
	}

	return request;
}

/**
 * Run the postReceive chain the node declares for an operation against a given response.
 *
 * This is the half of the routing the request tests cannot see: unwrapping the data envelope
 * and turning error bodies into readable failures.
 */
export async function postReceiveFor(
	nodeType: INodeType,
	parameters: IDataObject,
	response: { statusCode: number; body: unknown },
): Promise<IDataObject[]> {
	const { postReceive } = requestFor(nodeType, parameters);
	const node: INode = {
		id: 'test-node',
		name: NODE_NAME,
		type: NODE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};

	let items = [{ json: response.body as IDataObject }];

	const single = {
		getNode: () => node,
		getNodeParameter: (name: string) => parameters[name],
	};

	// n8n wraps each operation's actions in a { data, actions } envelope.
	type Envelope = { actions?: unknown[] };

	for (const entry of (postReceive ?? []) as Envelope[]) {
		for (const action of entry.actions ?? []) {
			if (typeof action === 'function') {
				items = await (action as (...args: unknown[]) => Promise<typeof items>).call(
					single,
					items,
					response,
				);
				continue;
			}

			const typed = action as { type?: string; properties?: { property: string } };

			if (typed.type === 'rootProperty' && typed.properties) {
				const property = typed.properties.property;

				items = items.flatMap((item) => {
					const value = (item.json as IDataObject)[property];

					return Array.isArray(value)
						? value.map((record) => ({ json: record as IDataObject }))
						: [{ json: value as IDataObject }];
				});
			}
		}
	}

	return items.map((item) => item.json);
}

/**
 * Evaluate one of n8n's routing expressions with n8n's own expression engine.
 *
 * Pagination expressions read $response and $request, which the engine supplies as additional
 * keys while paginating, so tests can check them against a stubbed response.
 */
export function evaluateExpression(
	expression: string,
	additionalKeys: IDataObject,
): unknown {
	const node: INode = {
		id: 'test-node',
		name: NODE_NAME,
		type: NODE_TYPE,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const workflow = new Workflow({
		id: 'test',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: {
			getByName: () => undefined as never,
			getByNameAndVersion: () => undefined as never,
			getKnownTypes: () => ({}),
		},
	});

	return workflow.expression.getParameterValue(
		expression,
		{ resultData: { runData: {} } },
		0,
		0,
		NODE_NAME,
		[{ json: {} }],
		'manual',
		additionalKeys,
		undefined,
		false,
	);
}
