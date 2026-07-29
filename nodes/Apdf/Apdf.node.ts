import {
	NodeConnectionTypes,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	analyticsFields,
	analyticsOperations,
	automationFields,
	automationOperations,
	documentFields,
	documentOperations,
	jobFields,
	jobOperations,
	linkFields,
	linkOperations,
	pdfFields,
	pdfOperations,
} from './descriptions';
import { APDF_CREDENTIALS } from '../../credentials/ApdfApi.credentials';
import { apdfApiRequest } from '../shared/transport';

export class Apdf implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apdf',
		name: 'apdf',
		icon: { light: 'file:apdf.svg', dark: 'file:apdf.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Track shared PDFs, read engagement analytics and process PDF files',
		defaults: {
			name: 'Apdf',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: APDF_CREDENTIALS,
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analytics',
						value: 'analytics',
					},
					{
						name: 'Automation',
						value: 'automation',
					},
					{
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Job',
						value: 'job',
					},
					{
						name: 'PDF',
						value: 'pdf',
					},
					{
						name: 'Tracking Link',
						value: 'link',
					},
				],
				default: 'document',
			},
			...analyticsOperations,
			...analyticsFields,
			...automationOperations,
			...automationFields,
			...documentOperations,
			...documentFields,
			...jobOperations,
			...jobFields,
			...linkOperations,
			...linkFields,
			...pdfOperations,
			...pdfFields,
		],
	};

	methods = {
		loadOptions: {
			/**
			 * Offer the workspace's documents as a dropdown, so nobody has to paste an ID.
			 */
			async getDocuments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await apdfApiRequest(this, 'GET', '/docs', {
					qs: { per_page: 100 },
				});

				return ((response.data ?? []) as IDataObject[]).map((document) => ({
					name: (document.name as string) || (document.doc_id as string),
					value: document.doc_id as string,
				}));
			},
		},
	};
}
