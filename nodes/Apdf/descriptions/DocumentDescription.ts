import type { INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { documentPicker } from '../../shared/fields';
import { rawOutput, resourceOutput } from '../../shared/output';
import { listOptions } from '../../shared/pagination';

/** Operations that address one existing document through its ID in the path. */
const operationsNeedingDocId = [
	'archive',
	'delete',
	'get',
	'makePrivate',
	'makePublic',
	'unarchive',
];

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('document'),
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive document',
				description: 'Hide a document from the active list without deleting it',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/archive' },
					output: resourceOutput,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create document',
				description: 'Upload a PDF from a URL so it can be shared and tracked',
				routing: {
					request: { method: 'POST', url: '/docs' },
					output: resourceOutput,
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete document',
				description: 'Permanently delete a document and its underlying PDF file',
				routing: {
					request: { method: 'DELETE', url: '=/docs/{{$parameter.docId}}' },
					output: rawOutput,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get document',
				description: 'Get a single document by its public ID',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many documents',
				description: 'List the documents in the workspace',
				routing: {
					request: { method: 'GET', url: '/docs' },
					output: resourceOutput,
				},
			},
			{
				name: 'Make Private',
				value: 'makePrivate',
				action: 'Make document private',
				description: 'Require a tracking link to view the document',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/private' },
					output: resourceOutput,
				},
			},
			{
				name: 'Make Public',
				value: 'makePublic',
				action: 'Make document public',
				description: 'Allow anyone with the viewer URL to open the document',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/public' },
					output: resourceOutput,
				},
			},
			{
				name: 'Unarchive',
				value: 'unarchive',
				action: 'Unarchive document',
				description: 'Return an archived document to the active list',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/unarchive' },
					output: resourceOutput,
				},
			},
		],
		default: 'getAll',
	},
];

export const documentFields: INodeProperties[] = [
	documentPicker(showFor('document', operationsNeedingDocId)),
	{
		displayName: 'File URL',
		name: 'file',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('document', ['create']),
		description: 'Publicly reachable URL of the PDF to track',
		routing: { send: { type: 'body', property: 'file' } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('document', ['create']),
		description: 'Display name for the document, shown in the dashboard and analytics',
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'active',
		displayOptions: showFor('document', ['getAll']),
		options: [
			{ name: 'Active', value: 'active', description: 'Only documents that are not archived' },
			{ name: 'Archived', value: 'archived', description: 'Only archived documents' },
			{ name: 'All', value: 'all', description: 'Active and archived documents' },
		],
		routing: { send: { type: 'query', property: 'status' } },
	},
	...listOptions(showFor('document', ['getAll'])),
];
