import type { INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { triggerEvents } from '../../shared/events';
import { conditionsCollection } from '../../shared/fields';
import { rawOutput, resourceOutput } from '../../shared/output';
import { listOptions } from '../../shared/pagination';

/** Operations that address one existing automation through its ID in the path. */
const operationsNeedingAutomationId = ['activate', 'deactivate', 'delete', 'duplicate', 'get'];

export const automationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('automation'),
		options: [
			{
				name: 'Activate',
				value: 'activate',
				action: 'Activate automation',
				description: 'Let an automation start firing again',
				routing: {
					request: {
						method: 'POST',
						url: '=/automations/{{$parameter.automationId}}/activate',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create automation',
				description: 'Call a webhook whenever readers do something to your documents',
				routing: {
					request: { method: 'POST', url: '/automations' },
					output: resourceOutput,
				},
			},
			{
				name: 'Deactivate',
				value: 'deactivate',
				action: 'Deactivate automation',
				description: 'Stop an automation firing without deleting it',
				routing: {
					request: {
						method: 'POST',
						url: '=/automations/{{$parameter.automationId}}/deactivate',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete automation',
				description: 'Permanently remove an automation and its execution history',
				routing: {
					request: { method: 'DELETE', url: '=/automations/{{$parameter.automationId}}' },
					output: rawOutput,
				},
			},
			{
				name: 'Duplicate',
				value: 'duplicate',
				action: 'Duplicate automation',
				description: 'Copy an automation, so you can vary one of its settings',
				routing: {
					request: {
						method: 'POST',
						url: '=/automations/{{$parameter.automationId}}/duplicate',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get automation',
				description: 'Get a single automation by its ID',
				routing: {
					request: { method: 'GET', url: '=/automations/{{$parameter.automationId}}' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Executions',
				value: 'getExecutions',
				action: 'Get automation executions',
				description: 'List when automations fired and what they delivered',
				routing: {
					request: { method: 'GET', url: '/automations/executions' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many automations',
				description: 'List the automations configured in the workspace',
				routing: {
					request: { method: 'GET', url: '/automations' },
					output: resourceOutput,
				},
			},
		],
		default: 'getAll',
	},
];

export const automationFields: INodeProperties[] = [
	{
		displayName: 'Automation ID',
		name: 'automationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('automation', operationsNeedingAutomationId),
		description: 'The ID of the automation, as returned by Get Many',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('automation', ['create']),
		description: 'How the automation is labelled in the Apdf dashboard',
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'multiOptions',
		default: [],
		required: true,
		displayOptions: showFor('automation', ['create']),
		description: 'Which reader events make this automation fire',
		options: triggerEvents,
		routing: { send: { type: 'body', property: 'events' } },
	},
	{
		displayName: 'Webhook URL',
		name: 'webhook_url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('automation', ['create']),
		description: 'Where Apdf posts the payload when the automation fires',
		routing: { send: { type: 'body', property: 'webhook_url' } },
	},
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		default: 'all',
		displayOptions: showFor('automation', ['create']),
		description: 'Whether the automation watches every document or only the ones you name',
		options: [
			{ name: 'All Documents', value: 'all' },
			{ name: 'Specific Documents', value: 'specific' },
		],
		routing: { send: { type: 'body', property: 'scope' } },
	},
	{
		displayName: 'Document IDs',
		name: 'docIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: '48927-c7621-ec3c0',
		displayOptions: showFor('automation', ['create'], { scope: ['specific'] }),
		description: 'Comma-separated document IDs the automation watches',
		routing: {
			send: {
				type: 'body',
				property: 'doc_ids',
				value: '={{ $parameter.docIds.split(",").map(id => id.trim()).filter(id => id !== "") }}',
			},
		},
	},
	{
		...conditionsCollection(showFor('automation', ['create'])),
		routing: {
			send: {
				type: 'body',
				property: 'conditions',
				value: '={{ $parameter.conditionsUi.condition }}',
			},
		},
	},
	{
		displayName: 'Webhook Headers',
		name: 'webhookHeadersUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add header',
		displayOptions: showFor('automation', ['create']),
		description: 'Headers Apdf sends with the webhook, for authenticating the call',
		options: [
			{
				displayName: 'Header',
				name: 'header',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The header name, for example X-Apdf-Secret',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'The value to send',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'webhook_headers',
				value:
					'={{ Object.fromEntries(($parameter.webhookHeadersUi.header || []).map(h => [h.name, h.value])) }}',
			},
		},
	},
	...listOptions(showFor('automation', ['getAll', 'getExecutions'])),
];
