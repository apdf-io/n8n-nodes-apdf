import type {
	DeclarativeRestApiSettings,
	IDisplayOptions,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

/** The largest page the Apdf API serves, so Return All needs as few requests as possible. */
const PAGE_SIZE = 100;

/**
 * Fetch every page of a list by setting "page" on the original request, until a page comes
 * back short. It deliberately does not follow links.next: Laravel builds those URLs without
 * withQueryString(), so they carry only "page" and would drop filters like status.
 */
export async function fetchAllPages(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const items: INodeExecutionData[] = [];

	for (let page = 1; ; page++) {
		const pageItems = await this.makeRoutingRequest({
			...requestData,
			options: {
				...requestData.options,
				qs: { ...requestData.options.qs, page, per_page: PAGE_SIZE },
			},
		});

		items.push(...pageItems);

		if (pageItems.length < PAGE_SIZE) {
			return items;
		}
	}
}

/** Return All plus Limit, the n8n convention for list operations. */
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
					pagination: fetchAllPages,
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
