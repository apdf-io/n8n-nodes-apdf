import type { INodeProperties } from 'n8n-workflow';
import { showFor } from '../../shared/display';
import { documentPicker, optionsCollection } from '../../shared/fields';
import { resourceOutput } from '../../shared/output';

export const signatureRequestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: showFor('signatureRequest'),
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel signature request',
				description: 'Withdraw the pending signature request of a document, so nobody can sign it anymore',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/signature-request/cancel' },
					output: resourceOutput,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create signature request',
				description:
					'Create a new e-signature request, asking each signer to sign their own part of the document',
				routing: {
					request: { method: 'POST', url: '=/docs/{{$parameter.docId}}/signature-request' },
					output: resourceOutput,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get signature request',
				description:
					'Retrieve the latest signature request of a document, with who has signed and, once everyone has, the signed PDF',
				routing: {
					request: { method: 'GET', url: '=/docs/{{$parameter.docId}}/signature-request' },
					output: resourceOutput,
				},
			},
		],
		default: 'create',
	},
];

export const signatureRequestFields: INodeProperties[] = [
	documentPicker(showFor('signatureRequest')),
	{
		displayName: 'Signers',
		name: 'signersUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		required: true,
		placeholder: 'Add signer',
		displayOptions: showFor('signatureRequest', ['create']),
		description:
			'Who signs which part of the document: a recipient by name and email, a member of your workspace, or your company',
		options: [
			{
				displayName: 'Signer',
				name: 'signer',
				values: [
					{
						displayName: 'Company Approval',
						name: 'company',
						type: 'boolean',
						default: false,
						description:
							'Whether your company approves this part automatically once everyone else has signed. Needs the company name in your account settings.',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'e.g. nathan@example.com',
						default: '',
						description: 'The email address of the recipient',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description:
							'The name of a recipient, who signs in their tracking link and confirms with a code sent to their email',
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'e.g. Client',
						description: 'The part of the document the signer signs. Each signer has their own role.',
					},
					{
						displayName: 'Workspace Member Email',
						name: 'member',
						type: 'string',
						default: '',
						description:
							'Instead of a name and email: a member of your workspace, who signs their own part after logging in and gets an email asking them to sign',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'signers',
				value:
					'={{ $parameter.signersUi.signer.map(signer => signer.company ? { role: signer.role, company: true } : signer.member ? { role: signer.role, member: signer.member } : { role: signer.role, name: signer.name, email: signer.email }) }}',
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'signatureFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add field',
		displayOptions: showFor('signatureRequest', ['create']),
		description:
			'Where each signer signs. Leave empty to use the fields placed in the dashboard, or, with a single signer, the empty signature boxes of the PDF.',
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Anchor Text',
						name: 'anchor',
						type: 'string',
						default: '',
						placeholder: 'e.g. [client_signature]',
						description: 'A text in the PDF. The field is placed at every place the text appears.',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 0,
						description:
							'Placing by coordinates instead: the page number, with X and Y in points from the top left corner. 0 leaves coordinates unused.',
					},
					{
						displayName: 'PDF Signature Box',
						name: 'pdf_field',
						type: 'string',
						default: '',
						description: 'The name of an empty signature box in the PDF',
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'string',
						default: '',
						required: true,
						description: 'The role of the signer who fills the field',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'signature',
						description: 'What the signer fills in. Date fields are filled in with the signing date.',
						options: [
							{ name: 'Date', value: 'date' },
							{ name: 'Initials', value: 'initials' },
							{ name: 'Name', value: 'name' },
							{ name: 'Signature', value: 'signature' },
							{ name: 'Text', value: 'text' },
						],
					},
					{
						displayName: 'X',
						name: 'x',
						type: 'number',
						default: 0,
						description: 'Distance from the left edge of the page in points',
					},
					{
						displayName: 'Y',
						name: 'y',
						type: 'number',
						default: 0,
						description: 'Distance from the top edge of the page in points',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'fields',
				value:
					'={{ $parameter.signatureFieldsUi.field.map(field => ({ role: field.role, type: field.type, ...(field.anchor ? { anchor: field.anchor } : {}), ...(field.pdf_field ? { pdf_field: field.pdf_field } : {}), ...(field.page > 0 ? { page: field.page, x: field.x, y: field.y } : {}) })) }}',
			},
		},
	},
	{
		displayName: 'Email Recipients',
		name: 'sendEmail',
		type: 'boolean',
		default: true,
		displayOptions: showFor('signatureRequest', ['create']),
		description:
			'Whether to email the recipients their signing link. Turn it off to share the links yourself. Workspace members are always emailed.',
		routing: { send: { type: 'body', property: 'send_email' } },
	},
	optionsCollection(
		[
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'A personal message for the signers in the invitation email',
				routing: { send: { type: 'body', property: 'message' } },
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description:
					'Your own keys and values, like a deal ID. They come back with the request and in the signature events.',
				routing: {
					send: {
						type: 'body',
						property: 'metadata',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
		],
		showFor('signatureRequest', ['create']),
	),
];
