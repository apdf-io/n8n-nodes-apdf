import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * Viewer events an Apdf automation can fire on, shared by the Apdf node's automation
 * resource and the Apdf Trigger so the two can never drift apart.
 */
export const triggerEvents: INodePropertyOptions[] = [
	{
		name: 'Annotation Created',
		value: 'annotation:create',
		description: 'A viewer created an annotation',
	},
	{
		name: 'Annotation Deleted',
		value: 'annotation:delete',
		description: 'A viewer removed an annotation',
	},
	{
		name: 'Annotation Updated',
		value: 'annotation:update',
		description: 'A viewer modified an annotation',
	},
	{
		name: 'Document Downloaded',
		value: 'document:download',
		description: 'A viewer downloaded the PDF',
	},
	{ name: 'Document Opened', value: 'document:loaded', description: 'A viewer opened the PDF' },
	{ name: 'Document Printed', value: 'document:print', description: 'A viewer printed the PDF' },
	{
		name: 'Form Submitted',
		value: 'form:submit',
		description: 'A viewer submitted a form in the PDF',
	},
	{
		name: 'Link Clicked',
		value: 'link:clicked',
		description: 'A viewer clicked a link in the PDF',
	},
	{
		name: 'Page Left',
		value: 'page:leave',
		description: 'A viewer navigated away from a page',
	},
	{
		name: 'Page Read',
		value: 'page:read',
		description: 'A viewer stayed on a page, measured every 15 seconds',
	},
	{ name: 'Page Viewed', value: 'page:enter', description: 'A viewer navigated to a page' },
	{ name: 'Text Copied', value: 'text:copied', description: 'A viewer copied text from the PDF' },
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
