import type { INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { rawOutput } from '../../shared/output';

export const jobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('job'),
		options: [
			{
				name: 'Check Status',
				value: 'checkStatus',
				action: 'Check job status',
				description: 'Poll an asynchronous PDF operation for its result',
				routing: {
					request: { method: 'POST', url: '/job/status/check' },
					output: rawOutput,
				},
			},
		],
		default: 'checkStatus',
	},
];

export const jobFields: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('job'),
		description: 'The job ID returned by an asynchronous PDF operation',
		routing: { send: { type: 'body', property: 'id' } },
	},
];
