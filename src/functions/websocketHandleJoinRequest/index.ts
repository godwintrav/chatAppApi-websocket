import { formatJSONResponse } from "@libs/APIResponses";
import Dynamo from "@libs/Dynamo";
import { websocket } from "@libs/Websocket";
import { APIGatewayProxyEvent } from "aws-lambda";
import { GroupRecord, JoinGroupRequestRecord, UserConnectionRecord, UserGroupRecord } from "src/types/dynamo";
import { v4 as uuid } from 'uuid';

export const handler = async (event: APIGatewayProxyEvent) => {

  try {
    const tableName = process.env.singleTable;

    const { connectionId, domainName, stage } = event.requestContext;
    const { groupId, requestId, userId, action } = JSON.parse(event.body);

    if (!groupId || !requestId || !userId || !action) {
      await websocket.send({
        connectionId,
        domainName,
        stage,
        message: JSON.stringify({
          message: 'groupId, requestId, userId, action, are required on the body',
          type: 'err',
        }),
      });
      return;
    }

    //get: groupJoinRequest, getAdminConnection, group, userGroupConnection
    const groupRecordPromise = Dynamo.get<GroupRecord>({ tableName, pkValue: groupId });

    const adminConnectionPromise = Dynamo.get<UserConnectionRecord>({ pkValue: connectionId, tableName });

    const groupRequestPromise = Dynamo.get<JoinGroupRequestRecord>({
      pkValue: requestId,
      tableName
    });

    //get user group connection to know if user is already a member of the group
    const userGroupConnectionPromise = await Dynamo.query<GroupRecord>({
      tableName,
      index: 'index2',
      pkKey: 'pk2',
      pkValue: userId,
      skKey: 'sk2',
      skValue: `group#${groupId}`,
    });

    const [groupRecord, adminConnection, joinGroupRequest, userGroupConnections] = await Promise.all([groupRecordPromise, adminConnectionPromise, groupRequestPromise, userGroupConnectionPromise]);

    if (groupRecord.ownerId !== adminConnection.userId) {
      await websocket.send({
        connectionId,
        domainName,
        stage,
        message: JSON.stringify({
          message: 'You are not the owner of this group',
          type: 'err',
        }),
      });
      return;
    }

    if (!joinGroupRequest) {
      await websocket.send({
        connectionId,
        domainName,
        stage,
        message: JSON.stringify({
          message: 'Join group request not found',
          type: 'err',
        }),
      });
      return;
    }

    //if action == reject - delete the request
    if (action == 'rejectJoinRequest') {
      await Dynamo.delete({
        pkValue: requestId,
        tableName
      });

      await websocket.send({
        connectionId,
        domainName,
        stage,
        message: JSON.stringify({
          message: 'Request has been rejected',
          type: 'info'
        }),
      });
      return;
    }

    if (userGroupConnections.length !== 0) {
      await websocket.send({
        connectionId,
        domainName,
        stage,
        message: JSON.stringify({
          message: 'User already a member of the group',
          type: 'err',
        }),
      });
      await Dynamo.delete({
        pkValue: requestId,
        tableName
      });
      return;
    }


    createUserGroupConnection: {
      const data: UserGroupRecord = {
        id: uuid(),
        pk: groupId,
        sk: `user#${userId}`,
        pk2: userId,
        sk2: `group#${groupId}`,

        userId,
        groupId,
        userName: joinGroupRequest.userName,
        groupName: groupRecord.groupName,
      };

      await Dynamo.write({ data, tableName });
    }

    await Dynamo.delete({
      pkValue: requestId,
      tableName
    });

    await websocket.send({
      connectionId,
      domainName,
      stage,
      message: JSON.stringify({
        message: 'User added to the group',
        type: 'info',
      }),
    });


    formatJSONResponse({ body: {} });

  } catch (error) {
    console.log(error);
    return;
  }
};