import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { triggerEvents } from '../shared/events';
import { conditionsCollection, optionsCollection } from '../shared/fields';
import { APDF_CREDENTIALS } from '../../credentials/ApdfApi.credentials';
import { apdfApiRequest, apdfApiRequestOrNull } from '../shared/transport';

/** Default name of the header Apdf sends and the webhook checks. */
const DEFAULT_AUTH_HEADER = 'X-Apdf-Secret';

/** Anything that can read node parameters, which is both the hooks and the webhook. */
type ParameterReader = Pick<IHookFunctions, 'getNodeParameter'>;

/**
 * The shared-secret header, read identically when creating the automation and when checking
 * an incoming request. Reading it in one place is what keeps the two sides in agreement.
 */
function authHeader(context: ParameterReader): { name: string; value: string } {
	const options = context.getNodeParameter('options', {}) as IDataObject;

	return {
		name: (options.authHeaderName as string) || DEFAULT_AUTH_HEADER,
		value: (options.authHeaderValue as string) ?? '',
	};
}

/**
 * The ID of the automation this trigger created, remembered between activations.
 *
 * n8n's static data is an untyped bag, so reading and writing it through one place keeps the
 * key from drifting between the three hooks that share it.
 */
function storedAutomation(context: IHookFunctions) {
	const staticData = context.getWorkflowStaticData('node');

	return {
		id: staticData.automationId as string | undefined,
		remember: (id: string) => {
			staticData.automationId = id;
		},
		forget: () => {
			delete staticData.automationId;
		},
	};
}

/**
 * Build the automation payload the API expects from the node's parameters.
 *
 * Kept separate from the hook so the mapping is readable on its own: comma-separated IDs
 * become an array, the condition and header collections become the API's shapes, and the
 * scope follows from whether any documents were named.
 */
function automationBody(context: IHookFunctions, webhookUrl: string): IDataObject {
	const events = context.getNodeParameter('events', []) as string[];
	const options = context.getNodeParameter('options', {}) as IDataObject;
	const conditionsUi = context.getNodeParameter('conditionsUi', {}) as IDataObject;
	const auth = authHeader(context);

	const docIds = (context.getNodeParameter('docIds', '') as string)
		.split(',')
		.map((docId) => docId.trim())
		.filter((docId) => docId !== '');

	const conditions = ((conditionsUi.condition ?? []) as IDataObject[]).map((condition) => ({
		type: condition.type,
		value: condition.value,
	}));

	return {
		name: (options.automationName as string) || `n8n: ${context.getWorkflow().name}`,
		events,
		webhook_url: webhookUrl,
		scope: docIds.length > 0 ? 'specific' : 'all',
		...(docIds.length > 0 ? { doc_ids: docIds } : {}),
		...(conditions.length > 0 ? { conditions } : {}),
		...(auth.value !== '' ? { webhook_headers: { [auth.name]: auth.value } } : {}),
	};
}

export class ApdfTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apdf Trigger',
		name: 'apdfTrigger',
		icon: { light: 'file:apdf.svg', dark: 'file:apdf.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Start a workflow when someone reads a PDF you shared with Apdf',
		defaults: {
			name: 'Apdf Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: APDF_CREDENTIALS,
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: [],
				required: true,
				description: 'Which reader events should start this workflow',
				options: triggerEvents,
			},
			{
				displayName: 'Documents',
				name: 'docIds',
				type: 'string',
				default: '',
				placeholder: '48927-c7621-ec3c0',
				description:
					'Comma-separated document IDs to watch. Leave empty to watch every document in the workspace.',
			},
			conditionsCollection(),
			{
				displayName:
					'Conditions cannot be combined with every event. A page number condition needs a page event, for example. Apdf rejects an invalid combination when the workflow is activated.',
				name: 'conditionsNotice',
				type: 'notice',
				default: '',
			},
			optionsCollection([

					{
						displayName: 'Automation Name',
						name: 'automationName',
						type: 'string',
						default: '',
						description:
							'Name for the automation created in Apdf. Defaults to the workflow name.',
					},
					{
						displayName: 'Auth Header Name',
						name: 'authHeaderName',
						type: 'string',
						default: DEFAULT_AUTH_HEADER,
						description: 'Which header Apdf sends the shared value in',
					},
					{
						displayName: 'Auth Header Value',
						name: 'authHeaderValue',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description:
							'Shared value Apdf must send, and that incoming requests are checked against. Leave empty to skip the check.',
					},
							]),

		],
	};

	webhookMethods = {
		default: {
			/**
			 * The automation is ours only if Apdf still has it and it still points at this
			 * webhook. A URL change means n8n reissued it, so the automation must be recreated.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const automation = storedAutomation(this);

				if (automation.id === undefined) {
					return false;
				}

				const response = await apdfApiRequestOrNull(this, 'GET', `/automations/${automation.id}`);
				const actions = ((response?.data as IDataObject)?.actions ?? []) as IDataObject[];
				const registered = actions.some(
					(action) =>
						((action.config ?? {}) as IDataObject).url === this.getNodeWebhookUrl('default'),
				);

				// Gone from Apdf, or repointed at a stale URL: let n8n create a fresh one.
				if (!registered) {
					automation.forget();
				}

				return registered;
			},

			/**
			 * Create the Apdf automation that will call this webhook.
			 */
			async create(this: IHookFunctions): Promise<boolean> {
				const events = this.getNodeParameter('events', []) as string[];

				if (events.length === 0) {
					throw new NodeOperationError(
						this.getNode(),
						'Select at least one event before activating the workflow.',
					);
				}

				const webhookUrl = this.getNodeWebhookUrl('default');
				const response = await apdfApiRequest(this, 'POST', '/automations', {
					body: automationBody(this, webhookUrl as string),
				});

				const automationId = (response.data as IDataObject)?.id as string | undefined;

				if (automationId === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						'Apdf did not return an automation ID, so the trigger cannot be tracked.',
					);
				}

				storedAutomation(this).remember(automationId);

				return true;
			},

			/**
			 * Remove the automation again when the workflow is deactivated.
			 */
			async delete(this: IHookFunctions): Promise<boolean> {
				const automation = storedAutomation(this);

				if (automation.id === undefined) {
					return true;
				}

				await apdfApiRequestOrNull(this, 'DELETE', `/automations/${automation.id}`);

				automation.forget();

				return true;
			},
		},
	};

	/**
	 * Apdf posts the automation execution payload here. Apdf has already filtered by event,
	 * document and conditions, so only the shared secret is re-checked.
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const auth = authHeader(this);

		if (auth.value !== '') {
			const headers = this.getHeaderData() as IDataObject;

			if (headers[auth.name.toLowerCase()] !== auth.value) {
				return { noWebhookResponse: true };
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body as IDataObject)],
		};
	}
}
