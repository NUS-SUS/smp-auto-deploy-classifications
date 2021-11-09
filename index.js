const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-southeast-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'TB_CLASSIFICATIONS';
const classificationsPath = '/classifications';
const classificationPath = '/classification';

exports.handler = async function (event) {
    console.log('Request event: ', event);
    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === classificationPath:
            response = await getClassification(event.queryStringParameters.CLASSIFICATIONS_ID);
            break;
        case event.httpMethod === 'GET' && event.path === classificationsPath:
            response = await getClassifications();
            break;
        case event.httpMethod === 'POST' && event.path === classificationPath:
            response = await saveClassification(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PUT' && event.path === classificationPath:
            response = await updateClassification(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === classificationPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyClassification(requestBody.CLASSIFICATIONS_ID);
            break;
        case event.httpMethod === 'DELETE' && event.path === classificationPath:
            response = await deleteClassification(JSON.parse(event.body).CLASSIFICATIONS_ID);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
}

async function getClassification(CLASSIFICATIONS_ID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'CLASSIFICATIONS_ID': CLASSIFICATIONS_ID
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

async function getClassifications() {
    const params = {
        TableName: dynamodbTableName
    }
    const allClassifications = await scanDynamoRecords(params, []);
    const body = {
        classifications: allClassifications
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

async function saveClassification(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'Classification has been successfully saved.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function updateClassification(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Classification has been successfully updated.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function modifyClassification(CLASSIFICATIONS_ID, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'CLASSIFICATIONS_ID': CLASSIFICATIONS_ID
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Classification updated successfully.',
            UpdatedAttributes: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function deleteClassification(CLASSIFICATIONS_ID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'CLASSIFICATIONS_ID': CLASSIFICATIONS_ID
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'Classification has been successfully deleted.',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    }
}
