import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';
import { conditionTypes } from './events';

/**
 * The document picker, used wherever an operation addresses one document. Only where it shows
 * differs between resources, so everything else is written once.
 */
export function documentPicker(displayOptions: IDisplayOptions): INodeProperties {
	return {
		displayName: 'Document Name or ID',
		name: 'docId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDocuments' },
		default: '',
		required: true,
		displayOptions,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

/**
 * The condition list an automation is narrowed by. Shared by the automation resource and the
 * trigger, which builds the same automation through the same API.
 */
export function conditionsCollection(displayOptions?: IDisplayOptions): INodeProperties {
	return {
		displayName: 'Conditions',
		name: 'conditionsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add condition',
		...(displayOptions ? { displayOptions } : {}),
		description:
			'Only fire when the reading session satisfies these. A page condition needs a page event, and an all-events automation takes none.',
		options: [
			{
				displayName: 'Condition',
				name: 'condition',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'page_number',
						description: 'Which measurement to test',
						options: conditionTypes,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
						description: 'The threshold to compare against, at least 1',
					},
				],
			},
		],
	};
}

/**
 * The "Options" collection every operation puts its optional parameters in. Only the contents
 * and where it shows differ, so the wrapper is written once.
 */
export function optionsCollection(
	options: INodeProperties[],
	displayOptions?: IDisplayOptions,
): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		...(displayOptions ? { displayOptions } : {}),
		options,
	};
}
