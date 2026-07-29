import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/**
 * Return All plus Limit, the n8n convention for list operations.
 *
 * Apdf paginates with page/per_page and reports the next page in links.next, so Return All
 * follows that link until it runs out, and Limit maps to per_page for a single request.
 */
export function listOptions(displayOptions: IDisplayOptions): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions,
			routing: {
				send: {
					paginate: '={{ $value }}',
				},
				operations: {
					pagination: {
						type: 'generic',
						properties: {
							continue: '={{ !!$response.body?.links?.next }}',
							request: {
								url: '={{ $response.body?.links?.next ?? $request.url }}',
							},
						},
					},
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			description: 'Max number of results to return',
			typeOptions: {
				minValue: 1,
				maxValue: 100,
			},
			validateType: 'number',
			displayOptions: {
				show: {
					...displayOptions.show,
					returnAll: [false],
				},
			},
			routing: {
				send: {
					property: 'per_page',
					type: 'query',
					value: '={{ $value }}',
				},
			},
		},
	];
}
