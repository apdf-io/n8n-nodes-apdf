import type { INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { documentPicker } from '../../shared/fields';
import { resourceOutput } from '../../shared/output';
import { listOptions } from '../../shared/pagination';

/** Operations that return a list and therefore accept paging. */
const paginatedOperations = ['getAnnotations', 'getFormSubmissions', 'getSessions'];

export const analyticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('analytics'),
		options: [
			{
				name: 'Get Annotations',
				value: 'getAnnotations',
				action: 'Get document annotations',
				description: 'List the highlights and comments readers left on a document',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/annotations' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Form Submissions',
				value: 'getFormSubmissions',
				action: 'Get document form submissions',
				description: 'List what readers typed into the forms in a document',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/form-submissions' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get KPIs',
				value: 'get',
				action: 'Get document analytics',
				description:
					'Get aggregate engagement for a document: sessions, viewers, completion rate and downloads',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/analytics' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Session',
				value: 'getSession',
				action: 'Get reading session',
				description: 'Get one reading session, including its per-page detail',
				routing: {
					request: {
						method: 'GET',
						url: '=/docs/{{$parameter.docId}}/analytics/sessions/{{$parameter.sessionId}}',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Get Sessions',
				value: 'getSessions',
				action: 'Get reading sessions',
				description: 'List the reading sessions recorded for a document',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/analytics/sessions' },
					output: resourceOutput,
				},
			},
		],
		default: 'get',
	},
];

export const analyticsFields: INodeProperties[] = [
	documentPicker(showFor('analytics')),
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('analytics', ['getSession']),
		description: 'The ID of the reading session, as returned by Get Sessions',
	},
	...listOptions(showFor('analytics', paginatedOperations)),
];
