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
				name: 'Add Annotation Comment',
				value: 'addAnnotationComment',
				action: 'Add a comment to an annotation',
				description:
					'Add a comment to an annotation, shown to readers in the document: the opening comment if it has none yet, otherwise a reply',
				routing: {
					request: {
						method: 'POST',
						url: '=/docs/{{$parameter.docId}}/annotations/{{$parameter.annotationId}}/comments',
					},
					output: resourceOutput,
				},
			},
			{
				name: 'Get Annotations',
				value: 'getAnnotations',
				action: 'Get document annotations',
				description: 'Retrieve the highlights and comments readers left on a document',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/annotations' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Document Analytics',
				value: 'get',
				action: 'Get document analytics',
				description:
					'Retrieve the engagement totals of a document: sessions, readers, completion rate and downloads',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/analytics' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Form Submissions',
				value: 'getFormSubmissions',
				action: 'Get document form submissions',
				description: 'Retrieve what readers typed into the forms in a document',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/form-submissions' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get Session',
				value: 'getSession',
				action: 'Get reading session',
				description: 'Retrieve a reading session, including its per-page detail',
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
				description: 'Retrieve a list of the reading sessions of a document',
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
		description: "The ID of the reading session, as returned by 'Get Sessions'",
	},
	{
		displayName: 'Annotation ID',
		name: 'annotationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('analytics', ['addAnnotationComment']),
		description: "The ID of the annotation, as returned by 'Get Annotations' or an annotation trigger",
	},
	{
		displayName: 'Author',
		name: 'author',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('analytics', ['addAnnotationComment']),
		description: 'Shown as the comment author in the document',
		routing: { send: { type: 'body', property: 'author' } },
	},
	{
		displayName: 'Comment',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: showFor('analytics', ['addAnnotationComment']),
		description: "Readers see it in the annotation's thread. It doesn't fire reader events.",
		routing: { send: { type: 'body', property: 'text' } },
	},
	...listOptions(showFor('analytics', paginatedOperations)),
];
