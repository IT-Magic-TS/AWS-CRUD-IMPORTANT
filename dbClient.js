import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
const REGION = 'eu-west-2'
const ddbClient = new DynamoDBClient({ region: REGION })
export { ddbClient }