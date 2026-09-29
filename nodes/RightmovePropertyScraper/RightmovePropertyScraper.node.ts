import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Rightmove Property Scraper" Actor: https://apify.com/scrapeunblocker/rightmove-scraper
const ACTOR_ID = 'ruxV1TNR1518wVkRW';
const INTEGRATION_APP_ID = 'scrapeunblocker-rightmove-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	channel: {
		key: 'channel',
	},
	sort: {
		key: 'sort',
	},
	minPrice: {
		key: 'min_price',
	},
	maxPrice: {
		key: 'max_price',
	},
	minBedrooms: {
		key: 'min_bedrooms',
	},
	maxBedrooms: {
		key: 'max_bedrooms',
	},
	propertyType: {
		key: 'property_type',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'property:search': {
			input.location = requireString.call(this, 'location', 'Location', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class RightmovePropertyScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Rightmove Property Scraper',
		name: 'rightmovePropertyScraper',
		icon: {
			light: 'file:rightmovePropertyScraper.png',
			dark: 'file:rightmovePropertyScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search Rightmove UK properties for sale or to rent with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'Rightmove Property Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Property',
						value: 'property',
					},
				],
				default: 'property',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['property'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search properties for sale or to rent in a UK place',
						action: 'Search properties',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'London',
				description: "UK place name, e.g. 'London', 'Manchester' or 'Milton Keynes'",
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 1008,
				},
				default: 48,
				description: 'How many properties to collect across pages (about 24 per page, up to 1008)',
				displayOptions: {
					show: {
						resource: ['property'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'For Sale or To Rent',
						name: 'channel',
						type: 'options',
						options: [
							{
								name: 'For Sale',
								value: 'buy',
							},
							{
								name: 'To Rent',
								value: 'rent',
							},
						],
						default: 'buy',
						description: 'Whether to search properties for sale or to rent',
					},
					{
						displayName: 'Max Bedrooms',
						name: 'maxBedrooms',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 4,
						description: 'Most bedrooms',
					},
					{
						displayName: 'Max Price (GBP)',
						name: 'maxPrice',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 500000,
						description: 'Highest price in GBP: purchase price for sale, rent per month to rent',
					},
					{
						displayName: 'Min Bedrooms',
						name: 'minBedrooms',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
						description: 'Fewest bedrooms',
					},
					{
						displayName: 'Min Price (GBP)',
						name: 'minPrice',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'Lowest price in GBP: purchase price for sale, rent per month to rent',
					},
					{
						displayName: 'Property Types',
						name: 'propertyType',
						type: 'string',
						default: '',
						placeholder: 'flat,terraced',
						description:
							'Comma-separated Rightmove property types: bungalow, detached, flat, land, park-home, semi-detached, terraced',
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'GB',
						description:
							'Exit-IP country as an ISO-2 code (e.g. GB). Leave empty for an automatically chosen exit.',
					},
					{
						displayName: 'Sort By',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Newest Listed',
								value: 'newest',
							},
							{
								name: 'Oldest Listed',
								value: 'oldest',
							},
							{
								name: 'Price: high to low',
								value: 'price_desc',
							},
							{
								name: 'Price: low to high',
								value: 'price_asc',
							},
							{
								name: 'Relevance',
								value: 'relevance',
							},
						],
						default: 'relevance',
						description: 'Result ordering',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
