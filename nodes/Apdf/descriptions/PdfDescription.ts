import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { optionsCollection } from '../../shared/fields';
import { rawOutput } from '../../shared/output';

/*
 * The page-syntax sentence is written out in full in each description rather than shared in a
 * constant. n8n's linter rewrites descriptions to add a final period, and doing that to a
 * template literal silently replaces the interpolation with the wrong text — so the literal
 * repetition below is deliberate. Change all of them together.
 */

/** Every operation except Create From HTML, Convert From Office and Merge takes a single source PDF URL. */
const singleFileOperations = [
	'addSecurity',
	'compress',
	'deletePages',
	'extractPages',
	'ocrConvert',
	'ocrRead',
	'ocrSearch',
	'overlay',
	'read',
	'readMetadata',
	'removeSecurity',
	'rotate',
	'search',
	'split',
	'toImage',
	'underlay',
];

/** Operations the API always runs on a queue, so they return a job ID instead of a result. */
const alwaysAsyncOperations = [
	'compress',
	'convert',
	'create',
	'ocrConvert',
	'ocrRead',
	'ocrSearch',
	'toImage',
];

/** Operations where the caller decides between an inline result and a job ID. */
const optionalAsyncOperations = [
	'addSecurity',
	'deletePages',
	'extractPages',
	'merge',
	'overlay',
	'read',
	'readMetadata',
	'removeSecurity',
	'rotate',
	'search',
	'split',
	'underlay',
];

/**
 * The opt-in async toggle. One collection is shared by an operation that supports it and one
 * that is always queued, so the caller can narrow when it shows.
 */
const asyncOption = (displayOptions?: IDisplayOptions): INodeProperties => ({
	displayName: 'Run Asynchronously',
	name: 'async',
	type: 'boolean',
	default: false,
	description: 'Whether to return a job ID immediately instead of waiting for the result',
	...(displayOptions ? { displayOptions } : {}),
	routing: { send: { type: 'body', property: 'async' } },
});

/**
 * The callback URL. Operations that are always queued word it differently, since there is no
 * choice to make: polling Check Status is the only alternative.
 */
const webhookUrlOption = (alwaysAsync = false): INodeProperties => ({
	displayName: 'Webhook URL',
	name: 'webhook_url',
	type: 'string',
	default: '',
	description: alwaysAsync
		? 'Called when the job finishes, instead of polling Check Status'
		: 'Called when an asynchronous job finishes',
	routing: { send: { type: 'body', property: 'webhook_url' } },
});

export const pdfOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('pdf'),
		options: [
			{
				name: 'Add Security',
				value: 'addSecurity',
				action: 'Add PDF security',
				description: 'Password-protect a PDF and set its permissions',
				routing: {
					request: { method: 'POST', url: '/pdf/security/add' },
					output: rawOutput,
				},
			},
			{
				name: 'Compress',
				value: 'compress',
				action: 'Compress PDF',
				description: 'Reduce the file size of a PDF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/file/compress' },
					output: rawOutput,
				},
			},
			{
				name: 'Convert From Office',
				value: 'convert',
				action: 'Convert DOC/XLS/PPT to PDF',
				description:
					'Turn a Word, Excel, PowerPoint, OpenDocument or RTF file into a PDF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/file/convert' },
					output: rawOutput,
				},
			},
			{
				name: 'Convert to Image',
				value: 'toImage',
				action: 'Convert PDF to image',
				description: 'Render pages as PNG, JPEG or TIFF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/file/to-image' },
					output: rawOutput,
				},
			},
			{
				name: 'Create From HTML',
				value: 'create',
				action: 'Create PDF from HTML',
				description: 'Render HTML into a PDF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/file/create' },
					output: rawOutput,
				},
			},
			{
				name: 'Delete Pages',
				value: 'deletePages',
				action: 'Delete PDF pages',
				description: 'Return the PDF without the given pages. The source file is not changed.',
				routing: {
					request: { method: 'POST', url: '/pdf/page/delete' },
					output: rawOutput,
				},
			},
			{
				name: 'Extract Pages',
				value: 'extractPages',
				action: 'Extract PDF pages',
				description: 'Return only the given pages as a new PDF',
				routing: {
					request: { method: 'POST', url: '/pdf/page/extract' },
					output: rawOutput,
				},
			},
			{
				name: 'Merge',
				value: 'merge',
				action: 'Merge PDF files',
				description: 'Join several PDFs, optionally taking only some pages of each',
				routing: {
					request: { method: 'POST', url: '/pdf/file/merge' },
					output: rawOutput,
				},
			},
			{
				name: 'OCR Convert',
				value: 'ocrConvert',
				action: 'Convert PDF with OCR',
				description: 'Add a searchable text layer to a scanned PDF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/ocr/convert' },
					output: rawOutput,
				},
			},
			{
				name: 'OCR Read Content',
				value: 'ocrRead',
				action: 'Read PDF content with OCR',
				description: 'Extract text from a scanned PDF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/ocr/read' },
					output: rawOutput,
				},
			},
			{
				name: 'OCR Search Content',
				value: 'ocrSearch',
				action: 'Search PDF content with OCR',
				description: 'Find text in a scanned PDF. Always runs asynchronously.',
				routing: {
					request: { method: 'POST', url: '/pdf/ocr/search' },
					output: rawOutput,
				},
			},
			{
				name: 'Overlay Pages',
				value: 'overlay',
				action: 'Overlay PDF pages',
				description: 'Stamp another PDF on top of the pages, for a watermark or letterhead',
				routing: {
					request: { method: 'POST', url: '/pdf/page/overlay' },
					output: rawOutput,
				},
			},
			{
				name: 'Read Content',
				value: 'read',
				action: 'Read PDF content',
				description: 'Extract the text of a PDF that already has a text layer',
				routing: {
					request: { method: 'POST', url: '/pdf/content/read' },
					output: rawOutput,
				},
			},
			{
				name: 'Read Metadata',
				value: 'readMetadata',
				action: 'Read PDF metadata',
				description: 'Get the page count, dimensions and document properties',
				routing: {
					request: { method: 'POST', url: '/pdf/metadata/read' },
					output: rawOutput,
				},
			},
			{
				name: 'Remove Security',
				value: 'removeSecurity',
				action: 'Remove PDF security',
				description: 'Return an unprotected copy of a password-protected PDF',
				routing: {
					request: { method: 'POST', url: '/pdf/security/remove' },
					output: rawOutput,
				},
			},
			{
				name: 'Rotate Pages',
				value: 'rotate',
				action: 'Rotate PDF pages',
				description: 'Turn pages by 90, 180 or 270 degrees',
				routing: {
					request: { method: 'POST', url: '/pdf/page/rotate' },
					output: rawOutput,
				},
			},
			{
				name: 'Search Content',
				value: 'search',
				action: 'Search PDF content',
				description: 'Find text and get the pages and positions it appears on',
				routing: {
					request: { method: 'POST', url: '/pdf/content/search' },
					output: rawOutput,
				},
			},
			{
				name: 'Split',
				value: 'split',
				action: 'Split PDF',
				description: 'Break a PDF into several files at the given page boundaries',
				routing: {
					request: { method: 'POST', url: '/pdf/file/split' },
					output: rawOutput,
				},
			},
			{
				name: 'Underlay Pages',
				value: 'underlay',
				action: 'Underlay PDF pages',
				description: 'Place another PDF behind the pages, for a background or template',
				routing: {
					request: { method: 'POST', url: '/pdf/page/underlay' },
					output: rawOutput,
				},
			},
		],
		default: 'merge',
	},
];

export const pdfFields: INodeProperties[] = [
	{
		displayName: 'File URL',
		name: 'file',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', singleFileOperations),
		description: 'Publicly reachable URL of the source PDF',
		routing: { send: { type: 'body', property: 'file' } },
	},
	{
		displayName: 'File URL',
		name: 'file',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['convert']),
		description:
			'Publicly reachable URL of the Office file: docx, doc, xlsx, xls, pptx, ppt, odt, ods, odp or rtf',
		routing: { send: { type: 'body', property: 'file' } },
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['create']),
		description: 'The HTML to render into a PDF',
		routing: { send: { type: 'body', property: 'html' } },
	},
	{
		displayName: 'Files',
		name: 'filesUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		required: true,
		placeholder: 'Add file',
		displayOptions: showFor('pdf', ['merge']),
		description: 'The PDFs to join, in the order they should appear',
		options: [
			{
				displayName: 'File',
				name: 'file',
				values: [
					{
						displayName: 'File URL',
						name: 'file',
						type: 'string',
						default: '',
						required: true,
						description: 'Publicly reachable URL of the PDF',
					},
					{
						displayName: 'Pages',
						name: 'pages',
						type: 'string',
						default: '',
						description:
							'Optional subset of pages to take from this file. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
					},
				],
			},
		],
		routing: {
			send: { type: 'body', property: 'files', value: '={{ $parameter.filesUi.file }}' },
		},
	},
	{
		displayName: 'Rotations',
		name: 'rotationsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		required: true,
		placeholder: 'Add rotation',
		displayOptions: showFor('pdf', ['rotate']),
		description: 'One entry per rotation to apply',
		options: [
			{
				displayName: 'Rotation',
				name: 'rotation',
				values: [
					{
						displayName: 'Angle',
						name: 'angle',
						type: 'options',
						default: '90',
						required: true,
						description: 'How far to turn the pages, clockwise',
						options: [
							{ name: '90°', value: '90' },
							{ name: '180°', value: '180' },
							{ name: '270°', value: '270' },
							{ name: '0° (Reset)', value: '0' },
						],
					},
					{
						displayName: 'Pages',
						name: 'pages',
						type: 'string',
						default: '',
						description:
							'Which pages to turn. Leave empty for every page. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'rotations',
				value: '={{ $parameter.rotationsUi.rotation }}',
			},
		},
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['deletePages', 'extractPages']),
		description: 'Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
		routing: { send: { type: 'body', property: 'pages' } },
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['split']),
		description:
			'Where to split. One file per comma-separated group, so 1,2-3 yields two files. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end. Or use nN to split into files of N pages each, for example n2.',
		routing: { send: { type: 'body', property: 'pages' } },
	},
	{
		displayName: 'Search Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['ocrSearch', 'search']),
		description: 'The text to look for',
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Overlay File URL',
		name: 'overlay',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['overlay']),
		description: 'Publicly reachable URL of the PDF to stamp on top',
		routing: { send: { type: 'body', property: 'overlay' } },
	},
	{
		displayName: 'Underlay File URL',
		name: 'underlay',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['underlay']),
		description: 'Publicly reachable URL of the PDF to place behind',
		routing: { send: { type: 'body', property: 'underlay' } },
	},
	{
		displayName: 'Owner Password',
		name: 'owner_password',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		displayOptions: showFor('pdf', ['addSecurity']),
		description: 'Password that grants full control over the PDF, including permissions',
		routing: { send: { type: 'body', property: 'owner_password' } },
	},
	{
		displayName: 'Image Type',
		name: 'image_type',
		type: 'options',
		default: 'png',
		required: true,
		displayOptions: showFor('pdf', ['toImage']),
		description: 'The image format to render each page as',
		options: [
			{ name: 'PNG', value: 'png' },
			{ name: 'JPEG', value: 'jpeg' },
			{ name: 'JPEG CMYK', value: 'jpegcmyk' },
			{ name: 'TIFF', value: 'tiff' },
		],
		routing: { send: { type: 'body', property: 'image_type' } },
	},

	// Optional parameters, grouped per operation so each collection only offers what applies.
	optionsCollection(
		[
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				default: '',
				description: 'HTML rendered as the footer of every page',
				routing: { send: { type: 'body', property: 'footer' } },
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'a4',
				description: 'Paper size. Ignored when width and height are given.',
				options: [
					{ name: 'A0', value: 'a0' },
					{ name: 'A1', value: 'a1' },
					{ name: 'A2', value: 'a2' },
					{ name: 'A3', value: 'a3' },
					{ name: 'A4', value: 'a4' },
					{ name: 'A5', value: 'a5' },
					{ name: 'A6', value: 'a6' },
					{ name: 'Ledger', value: 'ledger' },
					{ name: 'Legal', value: 'legal' },
					{ name: 'Letter', value: 'letter' },
					{ name: 'Tabloid', value: 'tabloid' },
				],
				routing: { send: { type: 'body', property: 'format' } },
			},
			{
				displayName: 'Header',
				name: 'header',
				type: 'string',
				default: '',
				description: 'HTML rendered as the header of every page',
				routing: { send: { type: 'body', property: 'header' } },
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 0,
				description: 'Custom page height. Must be set together with width.',
				routing: { send: { type: 'body', property: 'height' } },
			},
			{
				displayName: 'Margin Bottom',
				name: 'margin_bottom',
				type: 'number',
				default: 0,
				description: 'Bottom margin, in the chosen unit',
				routing: { send: { type: 'body', property: 'margin_bottom' } },
			},
			{
				displayName: 'Margin Left',
				name: 'margin_left',
				type: 'number',
				default: 0,
				description: 'Left margin, in the chosen unit',
				routing: { send: { type: 'body', property: 'margin_left' } },
			},
			{
				displayName: 'Margin Right',
				name: 'margin_right',
				type: 'number',
				default: 0,
				description: 'Right margin, in the chosen unit',
				routing: { send: { type: 'body', property: 'margin_right' } },
			},
			{
				displayName: 'Margin Top',
				name: 'margin_top',
				type: 'number',
				default: 0,
				description: 'Top margin, in the chosen unit',
				routing: { send: { type: 'body', property: 'margin_top' } },
			},
			{
				displayName: 'Orientation',
				name: 'orientation',
				type: 'options',
				default: 'portrait',
				description: 'Whether pages are taller than wide, or wider than tall',
				options: [
					{ name: 'Portrait', value: 'portrait' },
					{ name: 'Landscape', value: 'landscape' },
				],
				routing: { send: { type: 'body', property: 'orientation' } },
			},
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 0.1, maxValue: 2, numberPrecision: 2 },
				description: 'Zoom applied while rendering, between 0.1 and 2',
				routing: { send: { type: 'body', property: 'scale' } },
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'options',
				default: 'px',
				description: 'The unit that width, height and margins are given in',
				options: [
					{ name: 'Centimeters', value: 'cm' },
					{ name: 'Inches', value: 'in' },
					{ name: 'Millimeters', value: 'mm' },
					{ name: 'Pixels', value: 'px' },
				],
				routing: { send: { type: 'body', property: 'unit' } },
			},
			webhookUrlOption(true),
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 0,
				description: 'Custom page width. Must be set together with height.',
				routing: { send: { type: 'body', property: 'width' } },
			},
				],
		showFor('pdf', ['create']),
	),

	optionsCollection(
		[
			{
				displayName: 'Color Mode',
				name: 'color_mode',
				type: 'options',
				default: 'color',
				description: 'How much color information to keep',
				options: [
					{ name: 'Color', value: 'color' },
					{ name: 'Grayscale', value: 'gray' },
					{ name: 'Monochrome', value: 'mono' },
				],
				routing: { send: { type: 'body', property: 'color_mode' } },
			},
			{
				displayName: 'DPI',
				name: 'dpi',
				type: 'number',
				default: 150,
				typeOptions: { minValue: 1, maxValue: 300 },
				description: 'Rendering resolution, up to 300',
				routing: { send: { type: 'body', property: 'dpi' } },
			},
			{
				displayName: 'Pages',
				name: 'pages',
				type: 'string',
				default: '',
				description:
					'Which pages to render. Leave empty for every page. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
				routing: { send: { type: 'body', property: 'pages' } },
			},
			webhookUrlOption(true),
				],
		showFor('pdf', ['toImage']),
	),

	optionsCollection(
		[
			{
				displayName: 'From Page',
				name: 'from',
				type: 'string',
				default: '',
				description: 'First page to apply it to. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
				routing: { send: { type: 'body', property: 'from' } },
			},
			{
				displayName: 'Repeat',
				name: 'repeat',
				type: 'string',
				default: '',
				description:
					'Which pages of the overlay or underlay file to cycle through. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
				routing: { send: { type: 'body', property: 'repeat' } },
			},
			asyncOption(),
			{
				displayName: 'To Page',
				name: 'to',
				type: 'string',
				default: '',
				description: 'Last page to apply it to. Page numbers and ranges, for example 1,3-5. Use z for the last page and rN for the Nth page from the end.',
				routing: { send: { type: 'body', property: 'to' } },
			},
			webhookUrlOption(),
				],
		showFor('pdf', ['overlay', 'underlay']),
	),

	optionsCollection(
		[
			{
				displayName: 'Case Sensitive',
				name: 'case',
				type: 'boolean',
				default: false,
				description: 'Whether the search must match capitalisation exactly',
				routing: { send: { type: 'body', property: 'case' } },
			},
			{
				displayName: 'Treat as Regex',
				name: 'regex',
				type: 'boolean',
				default: false,
				description: 'Whether to read the search text as a regular expression',
				routing: { send: { type: 'body', property: 'regex' } },
			},
			asyncOption({ show: { '/operation': ['search'] } }),
			webhookUrlOption(),
				],
		showFor('pdf', ['ocrSearch', 'search']),
	),

	optionsCollection(
		[
			asyncOption(),
			{
				displayName: 'User Password',
				name: 'user_password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Password a reader needs to open the PDF. Omit to leave it openable.',
				routing: { send: { type: 'body', property: 'user_password' } },
			},
			webhookUrlOption(),
				],
		showFor('pdf', ['addSecurity']),
	),

	optionsCollection(
		[
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'The password that currently opens the PDF',
				routing: { send: { type: 'body', property: 'password' } },
			},
			asyncOption(),
			webhookUrlOption(),
				],
		showFor('pdf', ['removeSecurity']),
	),

	optionsCollection(
		[

			asyncOption(),
			webhookUrlOption(),
				],
		showFor('pdf', [
			'deletePages',
			'extractPages',
			'merge',
			'read',
			'readMetadata',
			'rotate',
			'split',
		]),
	),

	optionsCollection(
		[
			webhookUrlOption(true),
				],
		showFor('pdf', ['compress', 'convert', 'ocrConvert', 'ocrRead']),
	),

	{
		displayName: 'This Operation Always Runs Asynchronously and Returns a Job ID. Use the Job → Check Status Operation, or Set a Webhook URL, to Get the Result.',
		name: 'asyncNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor('pdf', alwaysAsyncOperations),
	},
	{
		displayName: 'Optional Async Operations Return a Job ID Only When Run Asynchronously Is Enabled.',
		name: 'optionalAsyncNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor('pdf', optionalAsyncOperations),
	},
];

