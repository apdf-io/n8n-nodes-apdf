import type { IDisplayOptions } from 'n8n-workflow';

/**
 * Build the displayOptions that show a property for one resource, optionally narrowed to
 * given operations and to further parameter values. Every description file uses this so the
 * shape is written one way.
 */
export function showFor(
	resource: string,
	operations?: string[],
	andWhen?: IDisplayOptions['show'],
): IDisplayOptions {
	return {
		show: {
			resource: [resource],
			...(operations ? { operation: operations } : {}),
			...andWhen,
		},
	};
}
