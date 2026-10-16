import type { INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { documentPicker } from '../../shared/fields';
import { deleteOutput, resourceOutput } from '../../shared/output';
import { listOptions } from '../../shared/pagination';

/** Operations that address one existing link through its token in the path. */
const operationsNeedingToken = ['activate', 'deactivate', 'delete'];

export const linkOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('link'),
		options: [
			{
				name: 'Activate',
				value: 'activate',
				action: 'Activate tracking link',
				description: 'Let the recipient open the document through this link again',
				routing: {
					request: {
						method: 'POST',
						url: '=/docs/{{$parameter.docId}}/links/{{$parameter.token}}/activate',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create tracking link',
				description: 'Create a new tracking link for one recipient, so their reading is attributed to them',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/links' },
					output: resourceOutput,
				},
			},
			{
				name: 'Deactivate',
				value: 'deactivate',
				action: 'Deactivate tracking link',
				description: 'Stop the recipient from opening the document without deleting the tracking link',
				routing: {
					request: {
						method: 'POST',
						url: '=/docs/{{$parameter.docId}}/links/{{$parameter.token}}/deactivate',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete tracking link',
				description: 'Delete a tracking link permanently',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/docs/{{$parameter.docId}}/links/{{$parameter.token}}',
					},
					output: deleteOutput,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tracking links',
				description: 'Retrieve a list of the tracking links of a document',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/links' },
					output: resourceOutput,
				},
			},
		],
		default: 'create',
	},
];

export const linkFields: INodeProperties[] = [
	documentPicker(showFor('link')),
	{
		displayName: 'Token',
		name: 'token',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		displayOptions: showFor('link', operationsNeedingToken),
		description: "The token identifying the tracking link, as returned by 'Get Many'",
	},
	{
		displayName: 'Recipient Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('link', ['create']),
		description: 'Who the link is for. Reading activity is attributed to this name.',
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Recipient Email',
		name: 'email',
		type: 'string',
		placeholder: 'e.g. nathan@example.com',
		default: '',
		displayOptions: showFor('link', ['create']),
		description: 'Recorded alongside the recipient name',
		routing: { send: { type: 'body', property: 'email' } },
	},
	...listOptions(showFor('link', ['getAll'])),
];
