import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/**
 * Return All plus Limit, the n8n convention for list operations.
 *
 * Return All walks the pages by incrementing the "page" parameter and comparing meta's
 * current_page with last_page. It deliberately does not follow links.next: Laravel builds
 * those URLs without withQueryString(), so they carry only "page" — following them would
 * silently drop filters like status and reset per_page from the second page onwards.
 * Overriding one parameter of the original request keeps everything else intact.
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
							continue:
								'={{ ($response.body?.meta?.current_page ?? 1) < ($response.body?.meta?.last_page ?? 1) }}',
							request: {
								url: '={{ $request.url }}',
								qs: {
									page: '={{ ($response.body?.meta?.current_page ?? 1) + 1 }}',
								},
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
