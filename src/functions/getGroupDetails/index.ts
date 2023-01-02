import { formatJSONResponse } from "@libs/APIResponses";
import { APIGatewayProxyEvent } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEvent) => {

  try {
    const tableName = process.env.singleTable;
    //get user and the groupId
    const { groupId } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!groupId) {
      return formatJSONResponse({
        body: { message: 'missing "groupId"' },
        statusCode: 400,
      });
    }

    //check user is part of the group

    formatJSONResponse({ body: {} });

  } catch (error) {
    console.log(error);
    return;
  }
};