import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * Reader events an Apdf automation can fire on, shared by the Apdf node's automation
 * resource and the Apdf Trigger so the two can never drift apart.
 */
export const triggerEvents: INodePropertyOptions[] = [
	{
		name: 'Annotation Created',
		value: 'annotation:create',
		description: 'A reader created an annotation',
	},
	{
		name: 'Annotation Deleted',
		value: 'annotation:delete',
		description: 'A reader removed an annotation',
	},
	{
		name: 'Annotation Updated',
		value: 'annotation:update',
		description: 'A reader modified an annotation or replied to its comment',
	},
	{
		name: 'Document Downloaded',
		value: 'document:download',
		description: 'A reader downloaded the document',
	},
	{ name: 'Document Opened', value: 'document:loaded', description: 'A reader opened the document' },
	{ name: 'Document Printed', value: 'document:print', description: 'A reader printed the document' },
	{
		name: 'Form Submitted',
		value: 'form:submit',
		description: 'A reader submitted a form in the document',
	},
	{
		name: 'Link Clicked',
		value: 'link:clicked',
		description: 'A reader clicked a link in the document',
	},
	{
		name: 'Page Left',
		value: 'page:leave',
		description: 'A reader navigated away from a page',
	},
	{
		name: 'Page Read',
		value: 'page:read',
		description: 'A reader stayed on a page, measured every 15 seconds',
	},
	{ name: 'Page Viewed', value: 'page:enter', description: 'A reader navigated to a page' },
	{ name: 'Text Copied', value: 'text:copied', description: 'A reader copied text from the document' },
];

/**
 * Condition templates the automation API accepts, narrowing when an automation fires.
 */
export const conditionTypes: INodePropertyOptions[] = [
	{ name: 'Completion Rate At Least (%)', value: 'completion_rate' },
	{ name: 'Page Number Equals', value: 'page_number' },
	{ name: 'Pages Viewed At Least', value: 'pages_viewed' },
	{ name: 'Time on Page At Least (Seconds)', value: 'time_on_page' },
	{ name: 'Total Reading Time At Least (Seconds)', value: 'total_reading_time' },
];
