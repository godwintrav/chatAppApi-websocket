import { formatJSONResponse } from "@libs/APIResponses";
import { APIGatewayProxyEvent } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEvent) => {

  try {
    const tableName = process.env.singleTable;

    const { connectionId, domainName, stage } = event.requestContext;

    formatJSONResponse({ body: {} });

  } catch (error) {
    console.log(error);
    return;
  }
};