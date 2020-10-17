/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var api = require('@atomist/api-cljs/atomist.middleware');
var fs = require('fs');

// Slack messages are an array of blocks
// they can be sent to #channels or @users.
var sendBlockMessage = async function(repo, request) {
  var message = JSON.parse(await fs.promises.readFile("blocks/notification.json"));

  message.blocks[0].text.text = `missing ${request.config.licensefile} file`;
  message.blocks[1].fields[0].text = `*Org:*\n${repo.owner}`;
  message.blocks[1].fields[1].text = `*Repo:*\n${repo.repo}`;

  return Promise.all(request.config.channel.map(async (channel) => {
    return request.blockMessage(message.blocks,`#${channel.channelName}`);
  }));
}

var checkRepo = async function(repo, request) {
  
  console.info(`check repo ${repo.owner}/${repo.repo} license file ${repo.basedir}/${request.config.licensefile} with ${JSON.stringify(request.config)} configuration`);

  if (fs.existsSync( `${repo.basedir}/${request.config.licensefile}` )) {
    return true
  } else {
    console.warn(`no ${request.config.licensefile} in ${repo.owner}/${repo.repo}`);
    return false
  }
}

var eachRepo = (request) => { 
  return async (repo) => {
    if ((request.config.publicOnly===false || (request.config.publicOnly&&repo.private===false)) && !await checkRepo(repo, request)) {
      await sendBlockMessage(repo, request);            
    }
    return true;
  }
}

exports.handler = api.handler(
 {
    sync: async (request) => {
      await request.withRepoIterator(
        eachRepo(request),
        {clone: true}
      );
    },
    OnSchedule: async (request) => {
      await request.withRepoIterator(
        eachRepo(request),
        {clone: true}
      );
    },
    OnAnyPush: async (request) => {
      await request.withRepo(
        eachRepo(request), 
        {clone: true}
      );
    }
 }
);
