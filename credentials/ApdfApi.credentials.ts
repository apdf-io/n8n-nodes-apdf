import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/** The credential's name, referenced by every node that authenticates with it. */
export const APDF_CREDENTIALS = 'apdfApi';

export class ApdfApi implements ICredentialType {
	name = APDF_CREDENTIALS;

	displayName = 'Apdf API';

	icon: Icon = { light: 'file:apdf.svg', dark: 'file:apdf.dark.svg' };

	documentationUrl = 'https://github.com/apdf-io/n8n-nodes-apdf?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName:
				'Create a token in <a href="https://apdf.io/dashboard/api/tokens" target="_blank">Dashboard → API → Tokens</a>. A token belongs to one workspace, so this credential acts on that workspace.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The API token created in your Apdf dashboard',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://apdf.io/api',
			description: 'Change this only if you run Apdf on a different host',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
				Accept: 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/docs',
		},
	};
}
