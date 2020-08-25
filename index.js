var api = require('@atomist/api-cljs/atomist.middleware');
var fs = require('fs');

// Slack messages are an array of blocks
// they can be sent to #channels or @users.
var sendBlockMessage = async function(repo, request) {
  return await request.blockMessage(
    [{type: "section",
      text: {type: "mrkdwn",
             text: `missing license file in ${repo.owner}/${repo.repo}`}},
    ],
    "#test-channel"
  );
}

var checkRepo = async function(repo, request) {
  console.info(`check repo ${repo.owner}/${repo.repo} with ${JSON.stringify(request.config)} configuration`);

  // probably sufficient to just write the content of the file since this 
  // won't make the working copy dirty when the content is up to date
  if (request.config.commitenabled===true) {
    await fs.promises.writeFile( request.config.licensefile, request.config.licensecontent, (err) => {
      console.error(`failed to write content to ${request.config.licensefile}: ${err}`);
    });
  }
  
  return true;
}

exports.handler = api.handler(
 {
    sync: async (request) => {
      await request.withRepoIterator(
        async repo => {
          return await checkRepo(repo, request);
        },
        {clone: true, with_commit: {message: request.config.commitmessage}}
      );
    },
    OnSchedule: async (request) => {
      await request.withRepoIterator(
        async repo => {
          return await checkRepo(repo, request);
        },
        {clone: true, with_commit: {message: request.config.commitmessage}}
      );
    },
    OnAnyPush: async (request) => {
      await request.withRepo(
        async repo => {
          return await checkRepo(repo, request);
        }, 
        {clone: true, with_commit: {message: request.config.commitmessage}}
      );
    }
 }
);

exports.handler(
  {
    correlation_id: "corrid",
    team: {id: "AEIB5886C"},
    command: "sync",
    api_version: "1",
    configuration: {
      name: "default",
      parameters: [
        {
         name: "schedule",
         value: "whatever"
        },
        {
          name: "licensefile",
          value: "license.txt"
        },
        {
          name: "commitenabled",
          value: false
        },
        {
          name: "licensecontent",
          value: "my license"
        },
        {
          name: "commitmessage",
          value: "commit message"
        }
      ]
    },
    source: {
      slack: {
        team: {
          id: "asdf"
        },
        user: {
          name: "slimslenderslacks"
        }
      }
    },
    secrets: [{uri: "atomist://api-key", value: "77995C52334AE2C78CC5F43736619984FC0956D5C8DF068109A827C719402ABF"}]
  },
//    {
//    data: {
//      ChatId: [
//        {screenName: "slimslenderslacks",
//         isBot: false}
//      ]
//    },
//    configuration: {
//      name: "default",
//      parameters: [
//        {
//          name: "testMode",
//          value: false
//        }
//      ]
//    },
//    extensions: {
//      operationName: "OnChatUser",
//      correlation_id: "corrid",
//      team_id: "T095SFFBK"
//    }
//  },
  (obj) => {console.info(`MOCK:  ${JSON.stringify(obj)}`);}
);
