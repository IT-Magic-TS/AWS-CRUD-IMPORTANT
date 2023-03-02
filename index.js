import { GetItemCommand, PutItemCommand, ScanCommand, DeleteItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ddbClient } from './dbClient.js';
import { v4 as uuidv4 } from 'uuid';

export const handler = async(event) => {
  console.log("request:", JSON.stringify(event, undefined, ))

  let body 
  
  try {
    switch (event.httpMethod) {
      case 'GET':
        if (event.queryStringParameters != null) {
          body = await getProductsByCategory(event )
        } else if (event.pathParameters != null) {
          body = await getProduct(event.pathParameters.id)
        } else {
          body = await getAllProducts()
        }
        break
      case 'POST':
        body = await createProduct(event) 
        break
      case 'DELETE':
        body = await deleteProduct(event.pathParameters.id)
        break
      case 'PUT':
        body = await updateProduct(event)
        break;
        
      default: 
        throw new Error(`Unsupported route: "${event.httpMethod}"`)
    } 
  
    const response = {
        statusCode: 200,
        body: JSON.stringify({
          message: `Successfully finished operation: "${event.httpMethod}"`,
          body: body
        })
    };
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to perform operation.',
        errorMsg: e.message,
        errorStack: e.stack
      })
    }
  }
};

const getProduct = async (productId) => {
  console.log('getProduct')
  try {

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({
        id: productId
      })
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params))

    console.log(Item)
    return (Item) ? unmarshall(Item) : {}
    
  } catch (e) {
    console.error(e)
    throw e
  }
}

// xxx/product/1?category=Phone
const getProductsByCategory = async (event) => {
  console.log('getProductsByCayegory')
  try {

    const productId = event.pathParameters.id
    const category = event.queryStringParameters.category

    const params = {
      KeyConditionExpression: 'id = :productId',
      FilterExpression: 'contains (category, :category)',
      ExpressionAttributeValues: {
        ":productId": { S: productId },
        ":category": { S: category }
      },
      TableName: process.env.DYNAMODB_TABLE_NAME 
    }

    const { Items } = await ddbClient.send(new QueryCommand(params))

    console.log(Items)

    return Items.map((item) =>unmarshall(item))
    
  } catch (e) {
    console.error(e)
    throw e
  }
}

const getAllProducts = async () => {
  console.log('getAllProducts')

  try {

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME 
    }

    const { Items } = await ddbClient.send(new ScanCommand(params))

    console.log(Items)

    return (Items) ? Items.map((item) => unmarshall(item)) : {}
    
  } catch (e) {
    console.error(e)
    throw e
  }
}

const createProduct = async (event) => {
  try {
    
    console.log(`createProduct function event: "${event}"`)

    const productRequest = JSON.parse(event.body)
    const productId = uuidv4()
    productRequest.id = productId

    const params = {  
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(productRequest || {})
    };

    const createResult = await ddbClient.send(new PutItemCommand(params))
    console.log(createResult)
    return createResult

  } catch (e) {
    console.error(e)
    throw e
  }
}

const deleteProduct = async (productId) => {
  console.log('deleteProduct function. productId: ' + productId)
  try {

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({
        id: productId
      })
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params))
    console.log(deleteResult)
    return deleteResult
     
  } catch (e) {
    console.error(e)
    throw e
  }
}

const updateProduct = async (event) => {
  const requestBody = JSON.parse(event.body)
  const objKeys = Object.keys(requestBody)
  console.log(`updateProduct function. requestBody: "${requestBody}", objKeys: "${objKeys}"`)

  try {

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({
        id: event.pathParameters.id
      }),
      UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join()}`,
      ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
        ...acc,
        [`#key${index}`]: key
      }), {}),
      ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
        ...acc,
        [`:value${index}`]: requestBody[key]
      }), {}))
    };

    const deleteResult = await ddbClient.send(new UpdateItemCommand(params))
    console.log(deleteResult)
    return deleteResult
     
  } catch (e) {
    console.error(e)
    throw e
  }
}